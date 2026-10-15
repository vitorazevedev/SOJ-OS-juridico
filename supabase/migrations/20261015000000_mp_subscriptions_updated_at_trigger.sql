-- Achado 1 do QA (Story 1.1): organization_mercadopago_subscriptions.updated_at
-- so era preenchido no INSERT (default now()), nunca atualizava sozinho num
-- UPDATE subsequente. O projeto ja tem a funcao reutilizavel
-- public.set_updated_at() (criada em 20260624000000_story007_security_advisor_fixes.sql),
-- mas ela nunca tinha sido de fato anexada a nenhuma tabela via CREATE TRIGGER
-- -- so existia, sem uso. As Stories 1.2/1.3 vao atualizar linhas dessa
-- tabela (renovacao, correcao de mp_customer_id) e vao esperar esse campo
-- refletir a realidade.
drop trigger if exists set_updated_at on public.organization_mercadopago_subscriptions;
create trigger set_updated_at
  before update on public.organization_mercadopago_subscriptions
  for each row
  execute function public.set_updated_at();
