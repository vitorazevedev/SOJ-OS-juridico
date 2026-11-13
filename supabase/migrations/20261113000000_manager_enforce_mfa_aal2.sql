-- Manager, Fase 1b -- MFA obrigatorio. docs/MANAGER_SPEC.md (secao 4,
-- linhas 136-140) ja desenhava is_staff()/has_staff_role() exigindo aal2
-- (sessao com segundo fator verificado) -- so nao entrou na Fase 1 Etapa A
-- porque o MFA em si (enroll/challenge) ainda nao existia nos apps.
--
-- NAO APLICAR esta migration antes dos 3 staff reais (CEO/CTO/CFO) terem
-- completado o enroll de MFA (confirmar via
-- `select user_id, status from auth.mfa_factors`) -- aplicar cedo demais
-- tranca todo mundo fora das telas staff-only dos dois apps ao mesmo
-- tempo, sem forma de entrar pra fazer o enroll (ver docs/manager-decisions.md,
-- secao "Fase 1b").

create or replace function public.is_staff(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff_members where id = p_user_id)
    and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

create or replace function public.has_staff_role(p_role public.staff_role, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members
    where id = p_user_id and p_role = any(roles)
  )
    and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;
