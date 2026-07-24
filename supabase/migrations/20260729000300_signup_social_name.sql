-- "Nome social" (opcional) passa a poder ser preenchido tambem no
-- cadastro publico da plataforma, logo apos o campo Nome. A coluna
-- users.social_name ja existia (adicionada pro cadastro de membros da
-- Equipe Ponderum); so falta o gatilho ler o metadata do cadastro
-- publico tambem.
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
  user_social_name text;
  user_phone text;
  org_cnpj text;
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Minha Organização');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_social_name := new.raw_user_meta_data->>'social_name';
  user_phone := new.raw_user_meta_data->>'phone';
  org_cnpj := new.raw_user_meta_data->>'cnpj';

  insert into public.organizations (name, plan_id, plan_status, cnpj)
  values (org_name, 'starter', 'trial', org_cnpj)
  returning id into new_org_id;

  insert into public.users (id, org_id, email, name, social_name, role, phone)
  values (new.id, new_org_id, new.email, user_name, user_social_name, 'admin', user_phone);

  return new;
end;
$$;
