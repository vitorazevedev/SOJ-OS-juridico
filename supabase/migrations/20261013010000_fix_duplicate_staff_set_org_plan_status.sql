-- Hotfix da migration anterior (20261013000000): CREATE OR REPLACE FUNCTION
-- com uma assinatura diferente (parametro novo p_plan_id) NAO substitui a
-- funcao antiga -- cria uma SEGUNDA funcao sobrecarregada. Resultado:
-- ficaram duas versoes de staff_set_org_plan_status coexistindo
-- (uuid,text) e (uuid,text,text) -- a de 2 argumentos manteve a logica
-- velha (recibo sempre fixo em R$490/Starter), nao a corrigida.
-- Remove a versao de 2 argumentos para sobrar so a versao com o parametro
-- opcional (chamadas com 2 ou 3 argumentos continuam validas via DEFAULT).
drop function if exists public.staff_set_org_plan_status(uuid, text);
