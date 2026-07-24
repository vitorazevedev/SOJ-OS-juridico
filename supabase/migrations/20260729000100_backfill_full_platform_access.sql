-- Antes da permissao granular, todo is_ponderum_staff via o menu regular
-- (Dashboard/Contratos/...) sem restricao nenhuma -- o unico efeito do
-- flag era ADICIONAR os menus internos, nunca remover o resto. Sem este
-- backfill, quem ja era staff perderia o menu normal ao ganhar
-- full_platform_access=false por padrao na coluna nova.
update public.users
set full_platform_access = true
where is_ponderum_staff = true;
