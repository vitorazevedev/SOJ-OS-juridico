import { Link } from "react-router-dom";

export default function Privacidade() {
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">Última atualização: 23 de junho de 2026</p>

          <h2 className="text-base font-medium text-foreground mt-2">1. Quem somos</h2>
          <p>
            O SOJ trata dados pessoais como controlador (dos dados da sua conta) e como operador (dos dados
            de terceiros mencionados nos contratos que você envia para análise), nos termos da Lei
            13.709/2018 (LGPD).
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Dados que coletamos</h2>
          <p>
            <strong>Da sua conta:</strong> nome, email, nome da organização.<br />
            <strong>Dos contratos que você envia:</strong> o texto integral do documento, que pode conter
            nomes, CPF/CNPJ, endereços, valores e outras informações das partes contratantes — pessoas que
            não têm relação direta de consentimento com o SOJ.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Para que usamos</h2>
          <p>
            Processamos o texto dos contratos via inteligência artificial (Claude/Anthropic) para extrair
            dados estruturados, identificar cláusulas de risco e estimar impacto financeiro. Não usamos o
            conteúdo dos seus contratos para treinar modelos de IA de terceiros.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Compartilhamento</h2>
          <p>
            Compartilhamos dados com provedores de infraestrutura necessários ao funcionamento do serviço
            (Supabase para banco de dados e armazenamento; Anthropic para processamento de IA; Resend para
            envio de emails de alerta). Não vendemos dados pessoais a terceiros.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Seus direitos</h2>
          <p>
            Você pode acessar, exportar ou solicitar a exclusão dos dados da sua organização pela tela de
            Configurações. Caso ainda não veja essas opções disponíveis, contate o suporte — essa
            funcionalidade está sendo implementada (STORY-007).
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">6. Retenção</h2>
          <p>
            Mantemos os dados da sua organização enquanto sua conta estiver ativa. Uma política formal de
            retenção e exclusão automática após período de inatividade está em definição.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">7. Segurança</h2>
          <p>
            Isolamos os dados de cada organização por controle de acesso a nível de banco de dados (Row
            Level Security), de forma que nenhuma organização pode acessar dados de outra.
          </p>

          <p className="pt-2">
            Veja também os <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
