import { Link } from "react-router-dom";

const FINALIDADES = [
  { finalidade: "Cadastro, gestão de conta e prestação das funcionalidades contratadas", base: "Execução de contrato ou procedimentos preliminares (art. 7º, V)" },
  { finalidade: "MFA/TOTP, recuperação de acesso, logs e prevenção de acessos indevidos", base: "Execução de contrato e/ou legítimo interesse em segurança (art. 7º, V e IX)" },
  { finalidade: "Controle de planos, convites, franquias de análise e usuários", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Cobrança, gestão de assinaturas, pagamentos, estornos e contestações", base: "Execução de contrato; obrigação legal e/ou exercício regular de direitos, conforme o caso" },
  { finalidade: "Emissão e conservação de documentos fiscais e registros exigidos", base: "Cumprimento de obrigação legal ou regulatória (art. 7º, II)" },
  { finalidade: "E-mails transacionais: verificação, cobrança, recuperação e alertas do serviço", base: "Execução de contrato (art. 7º, V)" },
  { finalidade: "Proteção antifraude, prevenção de abusos, monitoramento de erros", base: "Legítimo interesse (art. 7º, IX), com avaliação de necessidade" },
  { finalidade: "Feedback voluntário e aperfeiçoamento da Plataforma", base: "Legítimo interesse e/ou consentimento, conforme a operação" },
  { finalidade: "Newsletter solicitada voluntariamente", base: "Consentimento, com possibilidade de descadastro" },
];

const OPERADORES = [
  { servico: "Supabase", uso: "Banco de dados, arquivos, autenticação e MFA", dados: "Dados da conta e da Plataforma, inclusive elementos técnicos do TOTP" },
  { servico: "Anthropic / Claude API", uso: "Processamento de contratos por inteligência artificial", dados: "Conteúdo e texto dos documentos submetidos para análise" },
  { servico: "Resend", uso: "Envio de e-mails transacionais", dados: "E-mail, identificação do destinatário e conteúdo operacional da mensagem" },
  { servico: "Vercel", uso: "Hospedagem da interface web", dados: "Endereço IP, informações de requisição e logs técnicos" },
  { servico: "Sentry", uso: "Monitoramento de falhas de aplicação", dados: "Dados técnicos de erro e contexto de diagnóstico" },
  { servico: "Mercado Pago", uso: "Checkout, cobrança, recorrência, pagamentos, estornos e antifraude", dados: "Identificação, faturamento e dados de transação e do meio de pagamento" },
  { servico: "Google (quando utilizado)", uso: "Login federado OAuth", dados: "Dados de autenticação/identificação fornecidos no fluxo de login" },
];

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="https://ponderum.com" className="text-sm text-primary hover:underline">
          ← Voltar
        </a>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90 text-justify">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">
            Ponderum — plataforma de inteligência contratual · Última atualização: 18 de novembro de 2026
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">1. Identificação, escopo e papéis na LGPD</h2>
          <p>
            1.1 Esta Política explica como a GVF Serviços de Tecnologia Ltda., CNPJ nº 68.051.706/0001-16, com
            sede na Av. Manoel dos Santos Braga, nº 736, Vila Monte Santo, CEP 08062-010, São Paulo/SP
            ("Ponderum"), trata dados pessoais na plataforma Ponderum e, quando aplicável, em suas páginas de
            contratação e comunicação.
          </p>
          <p>
            1.2 A Ponderum atua, em regra, como controladora dos dados de cadastro, autenticação, contratação,
            cobrança, segurança e relacionamento com os Usuários. Quanto a dados pessoais de terceiros incluídos
            pelos clientes nos contratos enviados para análise, a organização contratante poderá atuar como
            controladora e a Ponderum como operadora, na medida em que trate tais dados segundo as instruções
            necessárias à prestação do serviço.
          </p>
          <p>
            1.3 Esta Política deve ser lida em conjunto com os{" "}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>. A coleta e o
            tratamento observarão a Lei nº 13.709/2018 (LGPD) e demais normas aplicáveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Categorias de dados pessoais tratados</h2>
          <p>
            2.1 <strong>Cadastro e organização:</strong> nome completo, endereço de e-mail, nome da organização,
            identificadores e permissões da conta, CPF ou CNPJ quando informado ou exigido para contratação, e
            setor de atuação quando fornecido.
          </p>
          <p>
            2.2 <strong>Autenticação e segurança:</strong> senha protegida por mecanismo de hash no provedor de
            autenticação, dados de sessão, endereços IP e registros de tentativas de acesso, indicadores de
            ativação do MFA, informações técnicas necessárias ao uso do fator TOTP e o segredo de autenticação
            gerenciado e armazenado na infraestrutura do Supabase. Não são solicitados números de telefone nem
            enviados SMS para o MFA TOTP descrito nesta versão.
          </p>
          <p>
            2.3 <strong>Contratos e análises:</strong> arquivos PDF, Word e imagens enviados; textos extraídos;
            dados pessoais eventualmente contidos nos documentos; informações de partes contratuais; resultados,
            classificações, sugestões, estimativas de impacto financeiro, obrigações e prazos cadastrados ou
            derivados dos documentos.
          </p>
          <p>
            2.4 <strong>Utilização e funcionamento:</strong> minutas geradas, feedbacks, operações de criação e
            exclusão, logs de auditoria, erros técnicos, tipo de navegador, sistema operacional, páginas e
            funcionalidades acessadas e preferências armazenadas localmente.
          </p>
          <p>
            2.5 <strong>Contratação, cobrança e documentos fiscais:</strong> nome ou razão social, CPF ou CNPJ,
            e-mail de cobrança, endereço de faturamento, plano e assinatura escolhidos, valores, descontos e
            cupons utilizados, datas, status de cobrança, pagamentos, devoluções, contestações e referências
            tokenizadas do meio de pagamento quando disponibilizadas pelo processador. A Ponderum não armazena em
            seu banco próprio o número integral ou código de segurança dos cartões.
          </p>
          <p>
            2.6 <strong>Convites e comunicações:</strong> endereço de e-mail dos convidados a participar da
            organização, identificadores e situação dos convites, inclusive quando o convidado ainda não tiver
            conta, além de registros de e-mails transacionais. O convite, conforme a implementação informada,
            expira em até 14 dias ou pode ser cancelado.
          </p>
          <p>
            2.7 <strong>Newsletter:</strong> e-mail e demais dados voluntariamente fornecidos em formulário
            próprio, caso o titular opte pela inscrição, além da informação necessária para atender pedidos de
            descadastro.
          </p>
          <p>
            2.8 O Usuário e a organização são responsáveis por verificar se possuem base jurídica e autorização
            para inserir dados de terceiros nos documentos enviados. Os contratos podem conter dados sujeitos a
            proteção especial; não devem ser enviados documentos desnecessários ao serviço.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Finalidades e fundamentos jurídicos</h2>
          <p>
            3.1 As principais finalidades e bases legais para operações em que a Ponderum atua como controladora
            são descritas a seguir. A base jurídica concreta poderá variar conforme o tipo de titular e o contexto
            da operação:
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
            3.2 No tratamento dos contratos recebidos em nome das organizações clientes, as finalidades e bases
            legais relativas aos dados pessoais constantes desses documentos deverão ser determinadas pela
            organização controladora, cabendo à Ponderum observar a relação contratual e suas instruções
            legítimas, quando atuar como operadora.
          </p>
          <p>
            3.3 O consentimento, quando utilizado, poderá ser revogado pelos meios indicados nesta Política, sem
            afetar tratamentos anteriores realizados de forma legítima nem as demais bases legais aplicáveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Compartilhamento e prestadores envolvidos</h2>
          <p>
            4.1 Para operar a Plataforma e o módulo de pagamentos, a Ponderum utiliza os serviços abaixo. A
            atuação de cada fornecedor como operador, controlador independente ou outro agente dependerá da
            operação específica e de seus instrumentos contratuais:
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Fornecedor</th>
                  <th className="px-3 py-2 font-medium">Uso principal</th>
                  <th className="px-3 py-2 font-medium">Dados envolvidos</th>
                </tr>
              </thead>
              <tbody>
                {OPERADORES.map((o) => (
                  <tr key={o.servico} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{o.servico}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.uso}</td>
                    <td className="px-3 py-2 text-muted-foreground">{o.dados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            4.2 O Mercado Pago processa os dados necessários às operações de pagamento e pode adotar práticas e
            obrigações próprias relativas a seus serviços financeiros. A Ponderum utiliza as informações recebidas
            do processador para gerir contratos, assinaturas, faturamento e suporte.
          </p>
          <p>
            4.3 Os contratos enviados para análise são transmitidos à API da Anthropic para extração e
            interpretação de texto, identificação de riscos e execução das funcionalidades contratadas. Segundo os
            termos comerciais aplicáveis à API informados no histórico da Plataforma, o conteúdo processado pela
            API comercial não é destinado ao treinamento geral dos modelos da Anthropic.
          </p>
          <p>
            4.4 A Ponderum não vende dados pessoais dos Usuários a terceiros nem os compartilha para publicidade
            de terceiros. Compartilhamentos adicionais poderão ocorrer para atender obrigação legal, ordem válida
            de autoridade ou proteger direitos legítimos, na forma da lei.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Transferência internacional de dados</h2>
          <p>
            5.1 Alguns fornecedores de infraestrutura e inteligência artificial estão sediados fora do Brasil e,
            conforme a operação, podem receber ou acessar dados pessoais internacionalmente. O banco de dados
            principal utilizado pela Plataforma encontra-se informado como hospedado na região sa-east-1 (São
            Paulo, Brasil), sem que isso elimine transferências decorrentes de outros serviços.
          </p>
          <p>
            5.2 As transferências internacionais devem observar as hipóteses legais do art. 33 da LGPD e, quando
            cabível, os instrumentos e requisitos da Resolução CD/ANPD nº 19/2024, inclusive cláusulas-padrão
            contratuais ou outros mecanismos adequados. A Ponderum observará os instrumentos aplicáveis aos
            prestadores envolvidos e disponibilizará informações adicionais aos titulares pelos canais de contato.
          </p>
          <p>
            5.3 O Mercado Pago é apresentado na arquitetura atual como processador de pagamento localizado no
            Brasil. Isso não implica que todas as demais operações da Plataforma estejam necessariamente
            restritas ao território nacional.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">6. Medidas de segurança e autenticação de dois fatores</h2>
          <p>
            6.1 São utilizadas medidas técnicas e organizacionais voltadas à proteção dos dados, incluindo
            segregação de organizações por controle de acesso no banco de dados (Row Level Security), criptografia
            em repouso e em trânsito fornecida pela infraestrutura, senhas submetidas a hash, tokens de sessão com
            expiração e mecanismos de prevenção de tentativas indevidas de acesso.
          </p>
          <p>
            6.2 O MFA utiliza códigos temporários de seis dígitos gerados por aplicativos compatíveis com o padrão
            TOTP. A infraestrutura de autenticação do Supabase gerencia os elementos necessários ao segundo fator,
            incluindo seu segredo técnico associado à conta. Os códigos temporários são gerados no aplicativo do
            Usuário; não há, no fluxo descrito, autenticação MFA por SMS ou coleta adicional de número de
            telefone.
          </p>
          <p>
            6.3 Se o Usuário perder o autenticador, o suporte poderá tratar dados estritamente necessários à
            verificação de identidade e à recuperação segura do acesso, realizando nova vinculação do fator de
            autenticação após as verificações cabíveis.
          </p>
          <p>
            6.4 Nenhum sistema é imune a incidentes. Ocorrendo incidente com risco ou dano relevante aos titulares,
            a Ponderum seguirá as obrigações de avaliação, documentação e comunicação à ANPD e aos titulares, nos
            prazos e condições previstos na LGPD e na regulamentação aplicável.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">7. Prazo de armazenamento e exclusão</h2>
          <p>
            7.1 As informações de conta, autenticação, contratos e demais dados operacionais serão mantidos
            durante a relação com o Usuário e pelo período adicional estritamente necessário ao cumprimento das
            finalidades legítimas aplicáveis.
          </p>
          <p>
            7.2 O titular ou Administrador poderá solicitar exclusão da conta pelas opções disponibilizadas em
            Configurações {" > "} Privacidade e Dados. A solicitação desencadeia a remoção de dados operacionais
            associados, inclusive documentos e análises, observadas as restrições técnicas e legais desta seção.
          </p>
          <p>
            7.3 A exclusão nos sistemas ativos não implica eliminação instantânea de todas as cópias de segurança,
            sujeitas ao ciclo de expurgo do fornecedor. Registros de cobrança, transações, notas fiscais e
            documentos correlatos poderão ser conservados pelos prazos impostos por legislação tributária,
            obrigações regulatórias e exercício regular de direitos.
          </p>
          <p>
            7.4 Contas e organizações inativas por período superior a 24 (vinte e quatro) meses poderão ser
            sinalizadas para revisão e eventual comunicação prévia, de acordo com os procedimentos internos.
          </p>
          <p>
            7.5 O encerramento de uma assinatura paga não equivale automaticamente ao encerramento da conta nem à
            exclusão integral dos dados. O tratamento posterior observará as finalidades e hipóteses legais
            aplicáveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">8. Direitos dos titulares</h2>
          <p>
            8.1 Nos termos da LGPD, o titular poderá requerer, conforme o caso, confirmação de tratamento; acesso;
            correção; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em
            desconformidade; portabilidade nos termos da regulamentação; informação sobre compartilhamento;
            revogação de consentimento; e demais direitos legalmente previstos.
          </p>
          <p>
            8.2 As opções de acesso, atualização, exportação e exclusão de conta poderão ser exercidas, conforme o
            recurso disponível, em Configurações {" > "} Privacidade e Dados. Pedidos não resolvidos por
            autoatendimento poderão ser encaminhados ao canal de privacidade.
          </p>
          <p>
            8.3 Para evitar divulgação indevida, a Ponderum poderá solicitar verificação razoável da identidade do
            solicitante antes de atender pedidos. Quando atuar como operadora dos contratos enviados por uma
            organização, poderá encaminhar o pedido à organização controladora e cooperar com sua execução nos
            termos aplicáveis.
          </p>
          <p>
            8.4 O atendimento poderá observar limitações legais, como a conservação de dados exigidos por lei, a
            proteção de segredos comerciais e o exercício regular de direitos. A Ponderum fornecerá justificativa
            quando não puder atender integralmente uma solicitação.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">9. Cookies, preferências e comunicações</h2>
          <p>
            9.1 A Plataforma utiliza cookies de sessão necessários à autenticação e armazenamento local
            (localStorage) para preferências de interface, como tema visual e filtros. Conforme a arquitetura
            documentada nesta versão, não utiliza cookies de publicidade comportamental de terceiros.
          </p>
          <p>
            9.2 E-mails sobre cadastro, recuperação, autenticação, obrigações, cobrança, assinatura, cancelamento
            e segurança são comunicações operacionais vinculadas à utilização da Plataforma. A inscrição
            voluntária em newsletter, quando realizada, poderá ser cancelada pelo mecanismo oferecido na própria
            comunicação.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">10. Dados de menores de idade</h2>
          <p>
            10.1 A Plataforma destina-se a pessoas jurídicas e a profissionais maiores de 18 anos e não foi
            concebida para cadastramento intencional de menores de idade. Se identificarmos uma conta irregular,
            adotaremos as medidas pertinentes conforme a legislação.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">11. Inteligência artificial e conteúdos de terceiros</h2>
          <p>
            11.1 As análises, classificações e sugestões geradas por IA podem envolver dados pessoais presentes no
            conteúdo dos contratos enviados. Esses resultados são ferramentas de apoio à revisão humana, não
            constituindo, por si, parecer jurídico ou decisão contratual obrigatória.
          </p>
          <p>
            11.2 A organização que envia o contrato deve observar os deveres de informação, segurança,
            confidencialidade e base legal referentes aos dados contidos no documento. Quando necessário,
            recomenda-se limitar ou ocultar informações pessoais não essenciais à análise.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">12. Atualizações desta Política</h2>
          <p>
            12.1 Alterações relevantes desta Política serão comunicadas por e-mail e aviso na Plataforma com
            antecedência mínima de 5 (cinco) dias, ressalvadas necessidades de adequação legal ou segurança que
            exijam outro tratamento permitido pela legislação.
          </p>
          <p>
            12.2 A versão publicada conterá a data efetiva de atualização. A continuidade do tratamento observará
            as bases legais pertinentes e, quando exigido, será obtido novo consentimento ou outro aceite cabível.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">13. Encarregado de dados e canais de contato</h2>
          <p>
            13.1 O canal de atendimento para dúvidas sobre esta Política e exercício de direitos dos titulares é
            contato@ponderum.com. O Encarregado pelo Tratamento de Dados Pessoais informado pela Ponderum é Vitor
            Moreira de Azevedo.
          </p>
          <p>13.2 Informações contratuais e operacionais também podem ser solicitadas ao canal indicado nos Termos de Uso: contato@ponderum.com.br. Os endereços deverão permanecer acessíveis e monitorados após a publicação.</p>
          <p>13.3 Esta Política é regida pela legislação brasileira, em especial pela LGPD.</p>

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
