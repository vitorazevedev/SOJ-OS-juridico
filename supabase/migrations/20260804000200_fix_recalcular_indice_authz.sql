-- Achado de varredura de seguranca: recalcular_indice_desequilibrio() e
-- SECURITY DEFINER (ignora RLS por definicao) e nao tinha NENHUM check de
-- autorizacao -- qualquer usuario autenticado podia chamar essa RPC direto
-- (supabase.rpc) passando o analysis_id de OUTRA organizacao, e a funcao
-- recalculava/sobrescrevia indice_desequilibrio daquele contrato sem
-- verificar dono nenhum. So a Edge Function (service_role) chama isso hoje;
-- adiciona o check preservando esse caminho legitimo.

create or replace function public.recalcular_indice_desequilibrio(p_analysis_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_params record;
  v_gravidades numeric[];
  v_g1 numeric;
  v_r numeric := 1;
  v_indice numeric;
  v_g numeric;
  v_i int;
begin
  if auth.role() <> 'service_role' and not exists (
    select 1 from public.contract_analyses ca
    join public.contracts c on c.id = ca.contract_id
    where ca.id = p_analysis_id and c.org_id = public.get_org_id()
  ) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  select * into v_params from public.indice_desequilibrio_parametros where vigente limit 1;

  select array_agg(gravidade order by gravidade desc)
    into v_gravidades
    from public.clause_risks
    where analysis_id = p_analysis_id
      and onera_parte_representada = true
      and gravidade >= v_params.corte_de_ruido;

  if v_gravidades is null or array_length(v_gravidades, 1) = 0 then
    update public.contract_analyses set indice_desequilibrio = null where id = p_analysis_id;
    return null;
  end if;

  v_g1 := v_gravidades[1];
  for v_i in 2 .. array_length(v_gravidades, 1) loop
    v_g := v_gravidades[v_i];
    v_r := v_r * (1 - v_params.lambda * v_g / 100);
  end loop;

  v_indice := v_g1 + (100 - v_g1) * (1 - v_r);
  update public.contract_analyses set indice_desequilibrio = round(v_indice, 2) where id = p_analysis_id;
  return round(v_indice, 2);
end;
$$;
