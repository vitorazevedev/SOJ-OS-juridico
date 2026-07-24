-- CPF/CNPJ passa a ser tratado como chave identificadora, entao nao pode se
-- repetir entre organizacoes. Indice parcial (ignora null) porque
-- organizacoes antigas ainda nao tem esse campo preenchido.
create unique index if not exists organizations_cnpj_unique
  on public.organizations (cnpj)
  where cnpj is not null;
