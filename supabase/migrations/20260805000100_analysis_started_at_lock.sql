-- contracts.status fica 'em_analise' tanto no estado "parseado, aguardando
-- clique" quanto durante a análise de verdade rodando -- não existe hoje
-- nenhum sinal no banco distinguindo os dois. A tela de Análise usava um
-- useState local pra mostrar "Analisando...", que não existe numa aba nova
-- ou após recarregar a página: o usuário via o botão "Analisar Contrato"
-- de novo enquanto uma análise real ainda estava rodando em outra aba,
-- podendo disparar uma segunda chamada concorrente à Claude API (custo
-- em dobro). analysis_started_at vira o lock real, lido via Realtime em
-- qualquer aba.

alter table public.contracts
  add column if not exists analysis_started_at timestamptz;
