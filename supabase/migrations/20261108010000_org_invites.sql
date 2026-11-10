-- Modulo "Equipe" -- convite real de usuario pra organizacao (antes so um
-- stub dizendo "em breve"). Junto, corrige a aplicacao do limite de
-- usuarios por plano: ate aqui so existia um gate binario (pago vs
-- freemium) em UsersTab.tsx, ignorando o numero real por plano
-- (1/3/5/10, ja presente em billing_plans.features.max_users).

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days')
);

create unique index org_invites_token_key on public.org_invites (token);

-- No maximo um convite PENDENTE por e-mail dentro da mesma organizacao
-- (nao impede reconvidar depois que o anterior expira/e revogado/aceito).
create unique index org_invites_pending_email_per_org
  on public.org_invites (organization_id, lower(email))
  where status = 'pending';

alter table public.org_invites enable row level security;

-- So leitura direta pelo cliente (listar convites pendentes da propria
-- organizacao, pra UsersTab mostrar e permitir cancelar). Criacao/revogacao
-- sempre via Edge Function com service_role, que valida papel de admin e
-- o limite de usuarios do plano antes de escrever -- mesmo padrao ja usado
-- em billing-change-plan/billing-cancel-subscription.
create policy org_invites_select on public.org_invites
  for select
  using (organization_id = public.get_org_id());

-- handle_new_user() passa a ser invite-aware: se o metadata do signup trouxer
-- um invite_token valido (pendente, nao expirado, e-mail bate), o novo
-- usuario entra na organizacao do convite em vez de ganhar uma organizacao
-- nova -- unico ponto de entrada de conta hoje (todo signup cria org nova,
-- sem excecao). O limite de usuarios e revalidado aqui de novo (defesa
-- contra corrida entre o convite ser criado e aceito).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  new_org_id uuid;
  org_name text;
  user_name text;
  user_social_name text;
  user_phone text;
  org_cnpj text;
  terms_accepted boolean;
  invite_token text;
  v_invite public.org_invites%rowtype;
  v_current_users int;
  v_max_users int;
begin
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_social_name := new.raw_user_meta_data->>'social_name';
  user_phone := new.raw_user_meta_data->>'phone';
  terms_accepted := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);
  invite_token := new.raw_user_meta_data->>'invite_token';

  if invite_token is not null then
    begin
      select i.* into v_invite
      from public.org_invites i
      where i.token = invite_token::uuid
        and i.status = 'pending'
        and i.expires_at > now()
        and lower(i.email) = lower(new.email)
      limit 1;
    exception when invalid_text_representation then
      v_invite := null;
    end;
  end if;

  if v_invite.id is not null then
    select count(*) into v_current_users from public.users where org_id = v_invite.organization_id;
    select coalesce((bp.features->>'max_users')::int, 1) into v_max_users
    from public.organizations o
    join public.billing_plans bp
      on bp.code = case when o.plan_status = 'active' then o.plan_id else 'freemium' end
    where o.id = v_invite.organization_id;

    if v_current_users < coalesce(v_max_users, 1) then
      insert into public.users (id, org_id, email, name, social_name, role, phone, terms_accepted_at)
      values (
        new.id, v_invite.organization_id, new.email, user_name, user_social_name,
        coalesce(v_invite.role, 'member'), user_phone,
        case when terms_accepted then now() else null end
      );

      update public.org_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;

      return new;
    end if;
    -- Limite estourou entre o convite ser criado e aceito -- cai no fluxo
    -- normal abaixo (cria organizacao propria) em vez de falhar o cadastro.
  end if;

  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Minha Organização');
  org_cnpj := new.raw_user_meta_data->>'cnpj';

  insert into public.organizations (name, plan_id, plan_status, cnpj)
  values (org_name, 'starter', 'trial', org_cnpj)
  returning id into new_org_id;

  insert into public.users (id, org_id, email, name, social_name, role, phone, terms_accepted_at)
  values (
    new.id, new_org_id, new.email, user_name, user_social_name, 'admin', user_phone,
    case when terms_accepted then now() else null end
  );

  return new;
end;
$function$;
