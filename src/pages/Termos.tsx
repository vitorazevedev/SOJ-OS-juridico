import { Link } from "react-router-dom";

export default function Termos() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Link to="/login" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>

        <div className="rounded-lg border border-risk-medium/40 bg-risk-medium-dim px-4 py-3 text-sm text-risk-medium">
          Rascunho mínimo para o beta — ainda não revisado por advogado. Não publicar como versão final sem revisão jurídica (ver STORY-007).
        </div>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Termos de Uso</h1>
          <p className="text-xs text-muted-foreground">Última atualização: 23 de junho de 2026</p>

          <h2 className="text-base font-medium text-foreground mt-2">1. O que é o SOJ</h2>
          <p>
            O SOJ (Sistema Operacional Jurídico) é uma plataforma de análise de contratos assistida por
            inteligência artificial. O SOJ não presta serviços de advocacia e não substitui a avaliação
            de um advogado habilitado — as análises, scores de risco e estimativas de exposição financeira
            geradas pela IA são apoio à decisão, não aconselhamento jurídico.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Conta e organização</h2>
          <p>
            Ao criar uma conta, você representa uma organização (sua empresa, escritório ou prática
            individual). Você é responsável por manter a confidencialidade das credenciais de acesso e
            por garantir que tem autorização para enviar os contratos que processar na plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Conteúdo enviado</h2>
          <p>
            Os contratos que você envia podem conter dados pessoais de terceiros (partes contratantes,
            CPF/CNPJ, valores). Você declara ter base legal para compartilhar esse conteúdo com o SOJ para
            fins de análise. Consulte nossa <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link> para
            saber como tratamos esses dados.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Limitação de responsabilidade</h2>
          <p>
            O SOJ é fornecido "como está". Não garantimos que as análises geradas por IA estejam livres de
            erros. Decisões contratuais e jurídicas finais devem ser revisadas por um profissional habilitado.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Cancelamento</h2>
          <p>
            Você pode cancelar sua conta a qualquer momento pela tela de Configurações. Consulte a Política
            de Privacidade para detalhes sobre exclusão e retenção de dados após o cancelamento.
          </p>
        </div>
      </div>
    </div>
  );
}
