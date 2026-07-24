-- Usuarios cadastrados manualmente pelo atendente (Equipe Ponderum > Cadastrar
-- novo usuario) nunca passam pela tela publica de cadastro, entao nunca
-- marcam a caixa "Li e aceito os Termos de Uso e a Politica de Privacidade".
-- Precisamos cobrar esse aceite no momento em que o usuario cria a propria
-- senha (tela /reset-password), e so liberar o acesso depois disso.

alter table public.users
  add column if not exists terms_accepted_at timestamptz;

-- Backfill: todo usuario ja existente veio do cadastro publico, que ja
-- exige o aceite antes de submeter o formulario -- entao ja aceitou de fato.
update public.users
set terms_accepted_at = created_at
where terms_accepted_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  user_name text;
  user_phone text;
  org_cnpj text;
  accepted_terms boolean;
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Minha Organização');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_phone := new.raw_user_meta_data->>'phone';
  org_cnpj := new.raw_user_meta_data->>'cnpj';
  -- Só o cadastro público envia esta flag (já validada no formulário antes do
  -- signUp). O cadastro manual pelo atendente nunca envia, entao fica NULL
  -- ate o usuario aceitar explicitamente ao criar a senha.
  accepted_terms := (new.raw_user_meta_data->>'terms_accepted')::boolean;

  insert into public.organizations (name, plan_id, plan_status, cnpj)
  values (org_name, 'starter', 'trial', org_cnpj)
  returning id into new_org_id;

  insert into public.users (id, org_id, email, name, role, phone, terms_accepted_at)
  values (new.id, new_org_id, new.email, user_name, 'admin', user_phone,
          case when accepted_terms then now() else null end);

  return new;
end;
$$;
