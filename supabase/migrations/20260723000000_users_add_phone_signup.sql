-- Adiciona WhatsApp/celular ao cadastro do usuario e passa a gravar
-- CPF/CNPJ (ja existia em organizations.cnpj, so nao era preenchido no
-- signup) -- ambos coletados agora na tela de criacao de conta para
-- contato e follow-up comercial.

alter table public.users
  add column if not exists phone text;

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
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Minha Organização');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_phone := new.raw_user_meta_data->>'phone';
  org_cnpj := new.raw_user_meta_data->>'cnpj';

  insert into public.organizations (name, plan_id, plan_status, cnpj)
  values (org_name, 'starter', 'trial', org_cnpj)
  returning id into new_org_id;

  insert into public.users (id, org_id, email, name, role, phone)
  values (new.id, new_org_id, new.email, user_name, 'admin', user_phone);

  return new;
end;
$$;
