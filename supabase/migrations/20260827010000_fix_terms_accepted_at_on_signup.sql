-- handle_new_user() (dispara no cadastro) copiava nome/telefone/CNPJ do
-- raw_user_meta_data mas nunca lia nem gravava terms_accepted -- a tela de
-- cadastro exige marcar a caixa de aceite dos Termos/Privacidade e envia
-- terms_accepted:true nos metadados, mas esse valor era descartado. Todo
-- usuario que se cadastrou pela tela normal ficava sem nenhum registro de
-- quando aceitou os termos -- relevante para LGPD/questao juridica, nao so
-- tecnica. Achado auditando a jornada do primeiro cliente real (Matrix),
-- 2026-08-27.

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
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'Minha Organização');
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  user_social_name := new.raw_user_meta_data->>'social_name';
  user_phone := new.raw_user_meta_data->>'phone';
  org_cnpj := new.raw_user_meta_data->>'cnpj';
  terms_accepted := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);

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

-- Backfill: usuarios que ja se cadastraram pela tela normal (que exige a
-- caixa marcada antes de prosseguir) mas ficaram sem o registro por causa
-- do bug acima. created_at e o proxy correto -- e o instante em que a
-- exigencia foi cumprida, so o timestamp nunca foi persistido.
update public.users
set terms_accepted_at = created_at
where terms_accepted_at is null;
