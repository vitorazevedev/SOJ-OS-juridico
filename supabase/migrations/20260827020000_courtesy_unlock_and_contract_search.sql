-- Liberacao de cortesia por analise (nao por organizacao inteira) -- gesto
-- comercial pontual (ex: falha tecnica que travou uma analise) sem promover
-- a organizacao inteira pra Starter, o que liberaria tudo, nao so aquela
-- analise. Motivado pelo caso real do cliente Matrix, 2026-08-27.

alter table public.contract_analyses
  add column if not exists courtesy_unlock boolean not null default false;

comment on column public.contract_analyses.courtesy_unlock is
  'Libera risk_score/risk_level/indice_desequilibrio pra essa analise especifica, independente do plan_status da organizacao -- gesto comercial pontual, setado via staff_set_courtesy_unlock.';

-- contract_analyses_gated: courtesy_unlock passa a ser uma segunda via de
-- liberacao, ao lado de plan_status='active'.
create or replace view public.contract_analyses_gated as
 SELECT ca.id,
    ca.contract_id,
    ca.summary,
    ca.financial_total,
    ca.financial_impact,
    ca.status,
    ca.model_used,
    ca.prompt_version,
    ca.tokens_input,
    ca.tokens_output,
    ca.cost_usd,
    ca.analyzed_at,
    ca.created_at,
    ca.parte_representada,
        CASE
            WHEN o.plan_status = 'active'::text OR ca.courtesy_unlock THEN ca.risk_score
            ELSE NULL::integer
        END AS risk_score,
        CASE
            WHEN o.plan_status = 'active'::text OR ca.courtesy_unlock THEN ca.risk_level
            ELSE NULL::text
        END AS risk_level,
        CASE
            WHEN o.plan_status = 'active'::text OR ca.courtesy_unlock THEN ca.indice_desequilibrio
            ELSE NULL::numeric
        END AS indice_desequilibrio
   FROM contract_analyses ca
     JOIN contracts c ON c.id = ca.contract_id
     JOIN organizations o ON o.id = c.org_id;

-- staff_set_courtesy_unlock: liga/desliga a liberacao de cortesia pra uma
-- analise especifica. Mesmo padrao de permissao de staff_set_org_blocked.
create or replace function public.staff_set_courtesy_unlock(p_analysis_id uuid, p_unlock boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  update public.contract_analyses set courtesy_unlock = p_unlock where id = p_analysis_id;
end;
$function$;

-- list_staff_contracts: busca por contrato/organizacao/contato, paginado --
-- mesmo padrao de list_staff_organizations, pro Painel Dev localizar rapido
-- um contrato especifico (ex: pra liberar visualizacao de cortesia) em vez
-- de depender da lista fixa de 10 mais recentes.
create or replace function public.list_staff_contracts(p_search text default null, p_page integer default 1, p_page_size integer default 10)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_result json;
  v_offset int := greatest(p_page - 1, 0) * p_page_size;
  v_search text := nullif(trim(p_search), '');
begin
  if not exists (
    select 1 from public.users
    where id = auth.uid() and can_view_ponderum_team = true
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  with base as (
    select
      c.id, c.name, c.status, c.created_at,
      o.id as org_id, o.name as org_name,
      ca.id as analysis_id, coalesce(ca.courtesy_unlock, false) as courtesy_unlock,
      u.name as contact_name, u.email as contact_email
    from public.contracts c
    join public.organizations o on o.id = c.org_id
    left join public.contract_analyses ca on ca.contract_id = c.id
    left join lateral (
      select name, email
      from public.users
      where org_id = o.id and role = 'admin'
      order by created_at asc
      limit 1
    ) u on true
    where
      v_search is null
      or c.name ilike '%' || v_search || '%'
      or o.name ilike '%' || v_search || '%'
      or u.name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
  )
  select json_build_object(
    'total', (select count(*)::int from base),
    'rows', coalesce((
      select json_agg(row order by row.created_at desc)
      from (
        select * from base
        order by created_at desc
        limit p_page_size offset v_offset
      ) row
    ), '[]'::json)
  ) into v_result;

  return v_result;
end;
$function$;
