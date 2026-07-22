import { Link } from "react-router-dom";

const OPERADORES = [
  { servico: "Supabase", empresa: "Supabase Inc. (EUA)", finalidade: "Banco de dados, autenticação e armazenamento de arquivos", dados: "Todos os dados da Plataforma" },
  { servico: "Anthropic / Claude API", empresa: "Anthropic PBC (EUA)", finalidade: "Análise de contratos por IA (extração de texto e identificação de riscos)", dados: "Conteúdo dos contratos enviados para análise" },
  { servico: "Resend", empresa: "Resend Inc. (EUA)", finalidade: "Envio de e-mails transacionais (alertas e confirmações)", dados: "Nome e e-mail do destinatário" },
  { servico: "Vercel", empresa: "Vercel Inc. (EUA)", finalidade: "Hospedagem da interface web", dados: "IPs de acesso e logs de requisição" },
  { servico: "Sentry", empresa: "Functional Software Inc. (EUA)", finalidade: "Monitoramento de erros em produção", dados: "Dados técnicos de erros, sem dados pessoais identificáveis" },
];

const FINALIDADES = [
  { finalidade: "Prestação do serviço de análise contratual e geração de minutas", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Controle de limites de uso conforme o plano contratado", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Envio de alertas por e-mail sobre vencimento de obrigações", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Comunicações operacionais (cadastro, recuperação de senha)", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Monitoramento de erros técnicos e manutenção da Plataforma", base: "Legítimo interesse (art. 7º, IX)" },
  { finalidade: "Coleta de feedback para melhoria do produto", base: "Legítimo interesse (art. 7º, IX)" },
  { finalidade: "Prevenção a fraude e segurança da informação", base: "Legítimo interesse (art. 7º, IX)" },
  { finalidade: "Cumprimento de obrigação legal ou regulatória, quando aplicável", base: "Cumprimento de obrigação legal (art. 7º, II)" },
];

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="https://ponderum.com" className="text-sm text-primary hover:underline">
          ← Voltar
        </a>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">
            Ponderum, plataforma de inteligência contratual · Última atualização: 04 de julho de 2026
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">1. Introdução e Identificação do Controlador</h2>
          <p>
            1.1 Esta Política de Privacidade descreve como a GVF Serviços de Tecnologia Ltda., inscrita no CNPJ
            nº 68.051.706/0001-16, com sede na Av. Manoel dos Santos Braga, nº 736, Vila Monte Santo, CEP
            08062-010, São Paulo/SP ("Ponderum", "Controladora", "nós"), coleta, utiliza, armazena, compartilha e
            protege os dados pessoais tratados por meio da plataforma Ponderum, em conformidade com a Lei nº
            13.709/2018 (Lei Geral de Proteção de Dados Pessoais, LGPD).
          </p>
          <p>1.2 Esta Política aplica-se a todos os Usuários da Plataforma e integra os{" "}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link> da Ponderum.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Dados Pessoais Coletados</h2>
          <p>
            2.1 <strong>Dados de cadastro:</strong> nome completo, e-mail, senha (armazenada com hash, nunca em
            texto puro), nome da organização, CNPJ ou CPF (opcional) e setor de atuação (opcional).
          </p>
          <p>
            2.2 <strong>Dados de contratos enviados:</strong> arquivos enviados pelo Usuário (PDF, Word e
            imagens), texto extraído pela inteligência artificial, resultados da análise (score de risco,
            cláusulas identificadas, sugestões), valores financeiros estimados associados a cláusulas de risco,
            e obrigações e prazos cadastrados manualmente.
          </p>
          <p>
            2.3 <strong>Dados de uso:</strong> contratos gerados pela Plataforma a partir de templates,
            feedbacks enviados pelo Usuário e logs de auditoria de criação e exclusão de contratos.
          </p>
          <p>
            2.4 <strong>Dados técnicos, coletados automaticamente:</strong> endereço IP, tipo de navegador e
            sistema operacional, páginas acessadas dentro da Plataforma, erros técnicos (monitorados pela
            ferramenta Sentry) e cookies de sessão e dados de armazenamento local (localStorage) para
            preferências de interface.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Finalidades e Bases Legais do Tratamento</h2>
          <p>
            3.1 Tratamos os dados pessoais acima para as seguintes finalidades, com as respectivas bases legais
            previstas no art. 7º da LGPD:
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Finalidade</th>
                  <th className="px-3 py-2 font-medium">Base legal</th>
                </tr>
              </thead>
              <tbody>
                {FINALIDADES.map((f) => (
                  <tr key={f.finalidade} className="border-t border-border">
                    <td className="px-3 py-2">{f.finalidade}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            3.2 Quando o tratamento depender de consentimento, por exemplo para cookies não essenciais que
            venham a ser implementados no futuro, este será solicitado de forma específica e destacada, podendo
            ser revogado a qualquer tempo.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Compartilhamento de Dados com Terceiros (Operadores)</h2>
          <p>4.1 Para viabilizar a prestação do serviço, a Ponderum compartilha dados pessoais com os seguintes operadores:</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Serviço</th>
                  <th className="px-3 py-2 font-medium">Empresa</th>
                  <th className="px-3 py-2 font-medium">Finalidade</th>
                  <th className="px-3 py-2 font-medium">Dados acessados</th>
                </tr>
              </thead>
              <tbody>
                {OPERADORES.map((o) => (
                  <tr key={o.servico} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{o.servico}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.empresa}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.finalidade}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.dados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>4.2 A Ponderum não vende dados pessoais a terceiros nem os compartilha para fins de publicidade de terceiros.</p>
          <p>
            4.3 O conteúdo dos contratos enviados para análise é transmitido à API da Anthropic, nos Estados
            Unidos, exclusivamente para a finalidade de extração de texto e identificação de riscos. A Anthropic
            não utiliza o conteúdo processado por meio de seus produtos comerciais (incluindo a API) para
            treinamento de seus modelos de inteligência artificial, conforme os Termos Comerciais e a Central de
            Privacidade da própria Anthropic. A Ponderum adota medidas técnicas de isolamento (segregação do
            conteúdo do Usuário por meio de marcação estrutural no prompt) para reduzir o risco de que
            instruções inseridas no conteúdo dos documentos influenciem indevidamente o comportamento da
            inteligência artificial.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Transferência Internacional de Dados</h2>
          <p>
            5.1 Em razão da utilização de provedores sediados nos Estados Unidos (Supabase, Anthropic, Resend,
            Vercel e Sentry), dados pessoais podem ser transferidos internacionalmente para fora do território
            brasileiro, ainda que o armazenamento primário dos dados do banco de dados ocorra em servidor da
            Supabase localizado na região sa-east-1 (São Paulo, Brasil).
          </p>
          <p>
            5.2 Essa transferência fundamenta-se na necessidade de execução do contrato entre o Usuário e o
            Ponderum (art. 33, II c/c art. 7º, V, da LGPD). Especificamente quanto à Anthropic, o Data Processing
            Addendum (DPA) com Cláusulas-Contratuais Padrão (Standard Contractual Clauses) é incorporado
            automaticamente aos Termos Comerciais da Anthropic no momento da criação da conta de API e aceite
            desses termos, dispensada a assinatura de instrumento separado. Quanto aos demais operadores
            (Supabase, Resend, Vercel e Sentry), a Ponderum ampara-se nos instrumentos padrão de proteção de
            dados já disponibilizados por cada um a seus clientes, prática usual entre plataformas SaaS que
            utilizam esses mesmos provedores.
          </p>
          <p>
            5.3 A Ponderum seleciona seus operadores com base em práticas de segurança da informação reconhecidas
            no mercado, exigindo, quando aplicável, compromissos contratuais de proteção de dados compatíveis com
            a LGPD.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">6. Segurança da Informação</h2>
          <p>6.1 A Ponderum adota as seguintes medidas técnicas e administrativas de segurança:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              isolamento de dados por organização, por meio de controle de acesso a nível de linha no banco de
              dados (Row Level Security), testado em ambiente de produção em 05/07/2026, com resultado de
              bloqueio total de acesso cruzado confirmado entre organizações distintas;
            </li>
            <li>
              criptografia em repouso (AES-256) para dados de banco de dados e arquivos armazenados, e
              criptografia em trânsito (TLS 1.2/1.3), fornecidas pela infraestrutura da Supabase;
            </li>
            <li>armazenamento de senhas com hash seguro, gerenciado pelo provedor de autenticação (Supabase GoTrue); as senhas nunca são armazenadas em texto puro;</li>
            <li>tokens de sessão (JWT) com expiração automática;</li>
            <li>opção de login federado via Google (OAuth 2.0) como alternativa ao cadastro por e-mail e senha;</li>
            <li>limite de tentativas de login (5 tentativas a cada 5 minutos, por endereço IP);</li>
            <li>validação técnica dos arquivos enviados, com verificação do tipo real do arquivo;</li>
            <li>monitoramento automático de erros em produção.</li>
          </ul>
          <p>
            6.2 Apesar dos esforços de segurança adotados, nenhum sistema é absolutamente livre de
            vulnerabilidades. Em caso de incidente de segurança que possa acarretar risco relevante aos
            titulares, a Ponderum comunicará a Autoridade Nacional de Proteção de Dados (ANPD) e os titulares
            afetados, nos termos do art. 48 da LGPD.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">7. Retenção e Exclusão de Dados</h2>
          <p>7.1 Os dados pessoais são mantidos enquanto a conta do Usuário estiver ativa.</p>
          <p>
            7.2 Organizações sem atividade por período superior a 24 (vinte e quatro) meses poderão ser
            sinalizadas internamente para revisão, podendo a Ponderum notificar o Usuário previamente à eventual
            exclusão dos dados por inatividade prolongada.
          </p>
          <p>
            7.3 Após a exclusão da conta pelo Usuário, os dados pessoais associados, incluindo contratos,
            análises, arquivos e demais informações da organização, são removidos de forma permanente e
            irreversível dos sistemas da Ponderum, ressalvados os backups mantidos pela Supabase conforme sua
            política interna de retenção, que seguem seu próprio ciclo de expurgo.
          </p>
          <p>
            7.4 Dados poderão ser mantidos por prazo adicional quando exigido por obrigação legal, regulatória
            ou para exercício regular de direitos em processo judicial, administrativo ou arbitral.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">8. Direitos do Titular</h2>
          <p>
            8.1 Nos termos do art. 18 da LGPD, o titular dos dados pode exercer, gratuitamente e a qualquer
            tempo, os seguintes direitos:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Confirmação e acesso: confirmação da existência de tratamento e acesso aos dados;</li>
            <li>Portabilidade: exportação completa dos dados em formato JSON ou PDF legível;</li>
            <li>Correção: atualização de dados incompletos, inexatos ou desatualizados;</li>
            <li>Eliminação: exclusão dos dados tratados com base em consentimento ou ao final do tratamento;</li>
            <li>Revogação do consentimento, quando o tratamento tiver esse fundamento;</li>
            <li>Informação sobre compartilhamento de dados com terceiros.</li>
          </ul>
          <p>
            8.2 Acesso, portabilidade e correção estão disponíveis diretamente na Plataforma, em Configurações
            {" > "}Privacidade e Dados. A exclusão completa da conta e de todos os dados associados também está
            disponível nessa mesma seção e produz efeitos imediatos e irreversíveis.
          </p>
          <p>8.3 Solicitações que não puderem ser resolvidas diretamente na Plataforma podem ser encaminhadas ao canal de contato indicado na Cláusula 10.</p>

          <h2 className="text-base font-medium text-foreground mt-2">9. Cookies e Armazenamento Local</h2>
          <p>
            9.1 A Ponderum utiliza cookies de sessão, estritamente necessários para manter o login do Usuário
            ativo, e dados de armazenamento local (localStorage) para lembrar preferências de interface, como
            tema visual e filtros de listagem.
          </p>
          <p>9.2 A Ponderum não utiliza cookies de rastreamento ou de publicidade de terceiros.</p>

          <h2 className="text-base font-medium text-foreground mt-2">10. Encarregado de Dados (DPO) e Canal de Contato</h2>
          <p>
            10.1 Para exercer os direitos previstos nesta Política ou esclarecer dúvidas sobre o tratamento de
            dados pessoais, o titular pode entrar em contato com o Encarregado de Dados (DPO) da Ponderum por
            meio do e-mail contato@ponderum.com.
          </p>
          <p>10.2 O Encarregado de Dados (DPO) da Ponderum é Vitor Moreira de Azevedo.</p>

          <h2 className="text-base font-medium text-foreground mt-2">11. Menores de Idade</h2>
          <p>
            11.1 A Plataforma é destinada exclusivamente a pessoas jurídicas e a profissionais maiores de 18
            anos. A Ponderum não coleta intencionalmente dados pessoais de menores de idade.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">12. Conteúdo Gerado por Inteligência Artificial</h2>
          <p>
            12.1 As minutas contratuais geradas pela Plataforma a partir de templates trazem, de forma
            automática e não removível, o aviso: "Este documento foi gerado pela Ponderum com base em modelos
            padrão de mercado. Recomendamos revisão por advogado habilitado antes da assinatura."
          </p>
          <p>
            12.2 As análises de risco, scores e estimativas de impacto financeiro gerados pela inteligência
            artificial são estimativas e não constituem parecer jurídico.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">13. Alterações desta Política</h2>
          <p>
            13.1 Esta Política poderá ser alterada a qualquer tempo, com comunicação prévia ao Usuário com
            antecedência mínima de 5 (cinco) dias, por e-mail e por aviso na própria Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">14. Disposições Finais</h2>
          <p>
            14.1 Esta Política é regida pelas leis da República Federativa do Brasil e pela Lei Geral de Proteção
            de Dados Pessoais (Lei nº 13.709/2018).
          </p>
          <p>14.2 Em caso de dúvida sobre esta Política, entre em contato pelo canal indicado na Cláusula 10.</p>

          <p className="pt-2">
            Veja também os <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>.
          </p>
          <p className="text-xs text-muted-foreground">
            Ponderum é uma marca da GVF Serviços de Tecnologia Ltda. © 2026. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
