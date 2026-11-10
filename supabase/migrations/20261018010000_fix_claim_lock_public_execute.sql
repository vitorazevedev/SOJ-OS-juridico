-- Hotfix da migration anterior (20261018000000): REVOKE ... FROM
-- authenticated, anon não bastou -- toda função nova recebe EXECUTE para
-- PUBLIC por padrão no Postgres, e authenticated/anon herdam isso de
-- PUBLIC mesmo com o revoke explícito feito a eles diretamente. Resultado:
-- qualquer usuário autenticado ainda podia chamar
-- claim_mercadopago_subscription_lock diretamente via RPC, contornando
-- toda a checagem de admin/org da Edge Function. Achado durante a própria
-- verificação (consulta a information_schema.routine_privileges), não
-- reportado por ninguém -- revoga de PUBLIC também.
revoke all on function public.claim_mercadopago_subscription_lock(uuid, text) from public;
