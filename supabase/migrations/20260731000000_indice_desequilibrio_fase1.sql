-- Fase 1 do Indice de Desequilibrio (renomeacao planejada do risk_score):
-- banco de ancoras versionado + parametros da formula agregadora, hoje
-- hardcoded em calculateHybridScore() no analyze-contract. Aditivo: nao
-- altera risk_score/risk_level/severity existentes, so adiciona colunas e
-- tabelas novas para o pipeline de IA comecar a gravar gravidade continua
-- por clausula e o indice calculado a partir dela.

create table if not exists public.ancoras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  categoria text not null,
  especie text not null check (especie in ('disparo', 'referencia_negativa')),
  titulo text not null,
  condicoes_disparo text not null,
  razao text not null,
  gravidade_referencia numeric not null check (gravidade_referencia >= 0 and gravidade_referencia <= 100),
  ativo boolean not null default true,
  versao int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ancoras enable row level security;

drop policy if exists ancoras_select on public.ancoras;
create policy ancoras_select on public.ancoras
  for select using (auth.uid() is not null);

create table if not exists public.indice_desequilibrio_parametros (
  id uuid primary key default gen_random_uuid(),
  versao int not null,
  lambda numeric not null default 0.20,
  corte_de_ruido numeric not null default 25,
  piso_critico numeric not null default 80,
  piso_alto numeric not null default 60,
  piso_medio numeric not null default 30,
  vigente boolean not null default false,
  nota text,
  created_at timestamptz not null default now()
);

-- so uma versao vigente por vez
create unique index if not exists one_vigente_parametros
  on public.indice_desequilibrio_parametros (vigente) where vigente;

alter table public.indice_desequilibrio_parametros enable row level security;

drop policy if exists indice_desequilibrio_parametros_select on public.indice_desequilibrio_parametros;
create policy indice_desequilibrio_parametros_select on public.indice_desequilibrio_parametros
  for select using (auth.uid() is not null);

insert into public.indice_desequilibrio_parametros (versao, vigente, nota)
select 1, true, 'Valores iniciais da especificacao v2.1 -- piso_alto sinalizado pelo Fellipe como possivelmente errado (55 pareceu fronteirico)'
where not exists (select 1 from public.indice_desequilibrio_parametros);

-- seed minimo pra testar o pipeline ponta a ponta antes do export real das 77 ancoras
insert into public.ancoras (codigo, categoria, especie, titulo, condicoes_disparo, razao, gravidade_referencia)
values
  ('MULT-001', 'Penalidades e Multas', 'disparo', 'Multa rescisoria assimetrica',
   'Contrato preve multa rescisoria devida apenas por uma das partes, ou em valor desproporcional entre as partes.',
   'Onus unilateral em clausula que deveria ser reciproca indica desequilibrio direto contra a parte representada.',
   75),
  ('FORO-001', 'Foro e Jurisdicao', 'disparo', 'Foro de eleicao distante da parte representada',
   'Foro escolhido nao e o domicilio de nenhuma das partes e dificulta o acesso da parte representada a justica.',
   'Dificultar o acesso a justica de uma parte especifica e um desequilibrio processual classico.',
   55),
  ('PAG-001', 'Pagamento e Reajuste', 'referencia_negativa', 'Reajuste anual por indice oficial (IPCA/IGPM)',
   'Reajuste atrelado a indice oficial publico, aplicado igualmente e sem discricionariedade de uma das partes.',
   'Pratica de mercado padrao; serve so de calibracao de normalidade, nunca deve contar como disparo.',
   5)
on conflict (codigo) do nothing;

alter table public.clause_risks
  add column if not exists gravidade numeric check (gravidade >= 0 and gravidade <= 100),
  add column if not exists ancora_id uuid references public.ancoras(id),
  add column if not exists onera_parte_representada boolean,
  add column if not exists justificativa_gravidade text,
  add column if not exists confianca text check (confianca in ('baixa', 'media', 'alta'));

alter table public.contract_analyses
  add column if not exists indice_desequilibrio numeric check (indice_desequilibrio >= 0 and indice_desequilibrio <= 100),
  add column if not exists parte_representada text;

-- recalculo deterministico (sem IA) para varrer lambda/pisos contra o
-- gabarito de 100 contratos sem re-chamar o modelo nem fazer deploy.
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
