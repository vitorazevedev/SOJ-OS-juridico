import { Link } from "react-router-dom";

const PLANOS = [
  { plano: "Freemium", mensalidade: "Gratuito", analises: "1", usuarios: "1" },
  { plano: "Individual", mensalidade: "R$ 199,00", analises: "5", usuarios: "1" },
  { plano: "Escritório", mensalidade: "R$ 499,00", analises: "15", usuarios: "3" },
  { plano: "Jurídico", mensalidade: "R$ 899,00", analises: "40", usuarios: "5" },
  { plano: "Corporativo", mensalidade: "R$ 1.749,00", analises: "100", usuarios: "10" },
];

export default function Termos() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="https://ponderum.com" className="text-sm text-primary hover:underline">
          ← Voltar
        </a>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90 text-justify">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Termos de Uso</h1>
          <p className="text-xs text-muted-foreground">
            Ponderum — plataforma de inteligência contratual · Última atualização: 18 de novembro de 2026
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">1. Identificação, objeto e aceitação</h2>
          <p>
            1.1 Estes Termos de Uso ("Termos") regulam o acesso e a utilização da Ponderum ("Plataforma"), serviço
            de software como serviço (SaaS) disponibilizado pela GVF Serviços de Tecnologia Ltda., CNPJ nº
            68.051.706/0001-16, com sede na Av. Manoel dos Santos Braga, nº 736, Vila Monte Santo, CEP 08062-010,
            São Paulo/SP ("Ponderum" ou "nós").
          </p>
          <p>
            1.2 O Usuário, ao realizar o cadastro e manifestar seu aceite eletrônico, declara ter lido e
            compreendido estes Termos e a{" "}
            <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>. O
            aceite e a contratação serão registrados pelos meios disponibilizados na Plataforma.
          </p>
          <p>
            1.3 Quando atuar em nome de organização, o Usuário declara possuir autorização para representá-la no
            uso do serviço e, quando aplicável, para contratar planos pagos. O Administrador da organização
            gerencia o acesso de seus Membros.
          </p>
          <p>
            1.4 Em caso de divergência, condições comerciais expressamente apresentadas e aceitas no checkout
            prevalecem quanto à transação específica, sem afastar direitos legais indisponíveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Descrição do serviço e limites da inteligência artificial</h2>
          <p>
            2.1 A Plataforma possibilita o envio de contratos para análise automatizada por inteligência
            artificial, a identificação de cláusulas e riscos, a organização de obrigações e prazos, a emissão de
            relatórios e, conforme as funcionalidades disponíveis, a geração de minutas a partir de modelos
            predefinidos.
          </p>
          <p>
            2.2 A Ponderum não presta serviços de advocacia, não emite parecer jurídico, não garante a validade ou
            a adequação jurídica dos documentos analisados ou gerados e não substitui a revisão por profissional
            habilitado. As respostas de IA são estimativas de apoio à decisão e podem conter erros, omissões,
            falsos positivos ou falsos negativos.
          </p>
          <p>
            2.3 A decisão sobre celebrar, modificar, rejeitar ou assinar um contrato é de responsabilidade do
            Usuário ou de sua organização, que deverá verificar a exatidão das informações e obter assistência
            profissional quando necessária.
          </p>
          <p>
            2.4 As minutas geradas pela Plataforma contêm aviso de que foram produzidas com base em modelos padrão
            de mercado e recomendam revisão por advogado habilitado antes da assinatura. O Usuário não deverá
            suprimir o aviso incorporado ao documento, que integra a minuta gerada.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Elegibilidade e informações cadastrais</h2>
          <p>
            3.1 A Plataforma é destinada a pessoas jurídicas e a profissionais maiores de 18 (dezoito) anos, que
            utilizem o serviço em nome próprio ou em nome de organização à qual estejam legitimamente vinculados.
          </p>
          <p>
            3.2 O Usuário deve fornecer dados verdadeiros, completos e atualizados, inclusive nome, e-mail,
            organização e, quando aplicável, CPF ou CNPJ e dados de faturamento. A Ponderum poderá solicitar
            correção de dados inconsistentes necessários ao cadastro ou à execução contratual.
          </p>
          <p>
            3.3 A Ponderum não busca cadastrar menores de idade e poderá desativar contas que não atendam aos
            requisitos de elegibilidade, observada a legislação aplicável.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Contas, organizações e membros</h2>
          <p>
            4.1 O acesso é realizado mediante cadastro por e-mail e senha ou por autenticação federada via Google,
            conforme os métodos efetivamente oferecidos pela Plataforma. Cada conta é vinculada a uma organização.
          </p>
          <p>
            4.2 A organização poderá ter um ou mais Membros, observado o limite do plano contratado. Ao menos um
            Membro terá perfil de Administrador, responsável por gerir convites, permissões e a exclusão de
            acessos de pessoas desligadas da organização.
          </p>
          <p>
            4.3 Os convites de ingresso em equipe são encaminhados por e-mail e, conforme o fluxo atual da
            Plataforma, permanecem válidos por até 14 (quatorze) dias, podendo ser cancelados pelo Administrador.
            Convites pendentes poderão contar para o limite de vagas do plano.
          </p>
          <p>
            4.4 Cada Usuário utilizará sua própria conta. É proibido compartilhar senhas, credenciais, fatores de
            autenticação ou sessões com terceiros não autorizados.
          </p>
          <p>
            4.5 Os conteúdos das organizações são segregados por mecanismos de controle de acesso. Essa medida não
            dispensa o dever dos Administradores de conceder apenas os acessos necessários aos respectivos
            Membros.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Autenticação de dois fatores (MFA) e recuperação de acesso</h2>
          <p>
            5.1 A Plataforma exige autenticação de dois fatores (MFA) nos fluxos de acesso em que essa verificação
            é solicitada. Além da autenticação inicial, o Usuário deverá apresentar código temporário gerado por
            aplicativo autenticador compatível com TOTP, de seis dígitos, quando requerido pelo sistema.
          </p>
          <p>
            5.2 O MFA descrito nesta versão utiliza aplicativo autenticador (como Google Authenticator ou Authy),
            e não códigos enviados por SMS. O Usuário é responsável por proteger o dispositivo, o aplicativo e os
            meios de recuperação a que tenha acesso, evitando compartilhamento, reprodução não autorizada ou
            armazenamento inseguro.
          </p>
          <p>
            5.3 A configuração do segundo fator integra os requisitos de segurança de acesso. A recusa ou
            impossibilidade de concluí-la poderá impedir o ingresso na Plataforma até a regularização.
          </p>
          <p>
            5.4 Em caso de perda, troca ou indisponibilidade do dispositivo autenticador, o Usuário deverá
            contatar o suporte da Ponderum por um canal oficial. A redefinição do segundo fator dependerá de
            verificação de identidade e de vínculo com a conta, com posterior cadastramento de novo autenticador.
          </p>
          <p>
            5.5 Para prevenir acesso indevido, a Ponderum poderá solicitar informações complementares, suspender
            temporariamente o procedimento ou negar a redefinição quando não for possível verificar a
            titularidade. A recuperação de acesso não é automática nem assegura disponibilidade imediata.
          </p>
          <p>
            5.6 A Ponderum poderá atualizar mecanismos de autenticação e aplicar verificações adicionais
            proporcionais aos riscos de segurança, informando mudanças relevantes aos Usuários quando cabível.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">6. Planos, preços e limites de utilização</h2>
          <p>
            6.1 A Ponderum oferece os seguintes planos para novas contratações, com cobrança mensal nos planos
            pagos e limites por organização:
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Plano</th>
                  <th className="px-3 py-2 font-medium">Mensalidade</th>
                  <th className="px-3 py-2 font-medium">Análises/mês</th>
                  <th className="px-3 py-2 font-medium">Usuários</th>
                </tr>
              </thead>
              <tbody>
                {PLANOS.map((p) => (
                  <tr key={p.plano} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{p.plano}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.mensalidade}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.analises}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.usuarios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            6.2 O plano Freemium não exige cartão de crédito, dá direito a 1 (uma) análise por mês e permite
            visualizar o relatório na Plataforma, sem exportação. Podem existir limitações de cópia ou de captura
            do resultado. Esses recursos dificultam, mas não garantem impedir tecnicamente a reprodução do
            conteúdo.
          </p>
          <p>
            6.3 Os planos pagos incluem as funcionalidades indicadas na oferta e, nos termos da página de planos,
            exportação de relatórios. O esgotamento da franquia mensal impede novas análises até o início do
            próximo ciclo ou alteração para plano que comporte o uso pretendido, com aviso ao Usuário na
            Plataforma.
          </p>
          <p>
            6.4 A franquia de análises e o limite de Membros seguem o ciclo de referência exibido na conta.
            Análises não utilizadas não são automaticamente acumuladas para o mês seguinte, salvo condição
            comercial expressamente informada na contratação.
          </p>
          <p>
            6.5 Permanece existente apenas para assinantes anteriores à migração o plano Starter legado, com
            mensalidade originalmente contratada de R$ 490,00, até 15 análises mensais e até 3 Membros por
            organização. Não está disponível para novas contratações. Condições anteriores de preço preservado
            serão observadas nos termos da oferta aceita, enquanto mantidas as condições aplicáveis ao assinante.
          </p>
          <p>
            6.6 Os planos denominados "Pro" e "Enterprise", referidos em versões anteriores destes Termos, deixam
            de integrar a oferta padrão atual, sem prejuízo de acordos individuais expressamente celebrados e
            ainda vigentes.
          </p>
          <p>
            6.7 São admitidos, nos limites técnicos informados: arquivos PDF de até 32 MB, arquivos Word/.docx de
            até 50 MB e imagens JPG/PNG de até 5 MB. Ajustes futuros de formatos e tamanhos serão informados na
            Plataforma.
          </p>
          <p>
            6.8 Promoções e cupons, quando disponíveis, terão regras próprias de validade, elegibilidade, planos,
            meios de pagamento, quantidade de usos e duração do desconto. A aplicação efetiva e o valor a pagar
            serão exibidos antes da confirmação da compra. Encerrado o período de desconto, a cobrança poderá
            retornar ao valor integral informado na contratação.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">7. Contratação, meios de pagamento e cobrança recorrente</h2>
          <p>
            7.1 Os pagamentos dos planos pagos são processados por Mercado Pago. As informações de cobrança e o
            meio de pagamento serão apresentados no checkout, antes da conclusão da assinatura.
          </p>
          <p>
            7.2 A contratação mensal autoriza a cobrança recorrente de cada ciclo enquanto a assinatura permanecer
            ativa, segundo as condições apresentadas e aceitas na confirmação. O próximo vencimento e o status da
            assinatura poderão ser consultados nos canais disponíveis na Plataforma.
          </p>
          <p>
            7.3 A cobrança por cartão de crédito está integrada ao processador. O Pix será oferecido somente se
            estiver efetivamente habilitado e disponível no checkout, observadas suas condições específicas. A
            Ponderum não assegura a disponibilidade permanente de todos os meios de pagamento.
          </p>
          <p>
            7.4 Os dados completos do cartão são tratados pelo processador de pagamentos; a Ponderum utiliza as
            referências ou tokens de pagamento e informações transacionais necessárias à administração da
            assinatura, sem armazenar o número completo e o código de segurança do cartão em seus sistemas
            próprios.
          </p>
          <p>
            7.5 Se uma cobrança for recusada, poderão ser enviadas comunicações pelo aplicativo e por e-mail.
            Poderá ser concedido prazo de regularização de 7 (sete) dias com manutenção temporária do acesso,
            seguido de suspensão caso o pagamento não seja concluído.
          </p>
          <p>
            7.6 Persistindo a inadimplência por 30 (trinta) dias após a suspensão de acesso, a assinatura poderá
            ser encerrada. O encerramento da assinatura não corresponde, por si só, à exclusão imediata da conta
            ou de seus dados, que seguirá as regras específicas de retenção e exclusão.
          </p>
          <p>
            7.7 A Ponderum poderá restringir tentativas de pagamento e solicitar validações adicionais para
            prevenção a fraude. Os valores e eventual tributo incidente serão identificados nos documentos fiscais
            e condições aplicáveis, sem promessa de emissão automática de nota fiscal enquanto tal rotina não
            estiver ativada.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">8. Alterações de plano e condições comerciais</h2>
          <p>
            8.1 O upgrade para plano superior poderá produzir efeitos assim que confirmado no sistema, com ajuste
            de limites e eventual cobrança complementar segundo os valores previamente exibidos e aceitos na
            operação.
          </p>
          <p>
            8.2 O downgrade solicitado pelo Usuário terá efeito, como regra operacional atual, na próxima
            renovação. Até então, permanecerão disponíveis as condições do plano vigente já pago, ressalvadas
            medidas de segurança ou disposição legal.
          </p>
          <p>
            8.3 A alteração para plano com menor limite de Membros poderá demandar regularização do número de
            participantes antes de sua efetivação. O sistema poderá impedir convites que ultrapassem a capacidade
            contratada.
          </p>
          <p>
            8.4 Mudanças de preço em novas contratações serão divulgadas nos canais comerciais. Alterações de
            condições econômicas de assinaturas em curso exigirão comunicação prévia adequada e observância da
            oferta, do contrato aceito e da legislação aplicável; não serão impostas retroativamente a ciclos já
            pagos.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">9. Cancelamento, arrependimento, reembolsos e contestações</h2>
          <p>
            9.1 O titular ou Administrador autorizado poderá solicitar o cancelamento da assinatura pelos
            controles disponibilizados na Plataforma, sem prejuízo de atendimento pelo suporte. A Ponderum
            confirmará o recebimento da solicitação por meio adequado.
          </p>
          <p>
            9.2 Fora das hipóteses legais que assegurem restituição ou de condição comercial específica, o
            cancelamento interrompe futuras renovações e mantém o acesso ao plano pago até o término do ciclo já
            quitado, conforme as condições contratadas. O cancelamento não implica, isoladamente, exclusão dos
            dados ou da organização.
          </p>
          <p>
            9.3 Quando aplicável uma relação de consumo e preenchidos os requisitos do art. 49 do Código de Defesa
            do Consumidor, o contratante poderá exercer o direito de arrependimento dentro do prazo legal de 7
            (sete) dias, com restituição integral dos valores devidos, nos termos da legislação. Esse direito não
            depende exclusivamente de cadastro por CPF ou CNPJ, mas do enquadramento jurídico da contratação.
          </p>
          <p>
            9.4 Pedidos de reembolso fora das hipóteses legalmente obrigatórias serão avaliados à luz da oferta
            efetivamente aceita, das condições específicas eventualmente anunciadas e do caso concreto, não
            havendo promessa de devolução proporcional fora das hipóteses legais ou de condição comercial
            expressamente aceita.
          </p>
          <p>
            9.5 O estorno poderá depender dos prazos e procedimentos do Mercado Pago e do emissor do instrumento
            de pagamento. A Ponderum prestará as informações de acompanhamento disponíveis ao contratante.
          </p>
          <p>
            9.6 A contestação de pagamento (chargeback) poderá ensejar bloqueio preventivo do acesso ou de novas
            cobranças enquanto o caso for apurado, quando necessário e proporcional para prevenção a fraude,
            respeitados os direitos do contratante e a possibilidade de regularização. A liberação de nova
            cobrança por cartão poderá depender de verificação pela equipe.
          </p>
          <p>
            9.7 O contratante poderá utilizar contato@ponderum.com.br para esclarecer dúvidas ou formalizar
            solicitações relativas a cancelamento, arrependimento, cobrança ou contestação, sem prejuízo dos
            canais diretamente disponíveis na Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">10. Propriedade intelectual e conteúdos</h2>
          <p>
            10.1 Os arquivos e contratos enviados pelos Usuários permanecem de propriedade de seus titulares. A
            Ponderum recebe autorização limitada ao tratamento necessário à prestação do serviço, na forma destes
            Termos e da Política de Privacidade.
          </p>
          <p>
            10.2 As minutas finais geradas e preenchidas com dados do Usuário poderão ser utilizadas nos fins a
            que se destinam. Permanecem de titularidade da Ponderum ou de seus licenciantes os modelos, templates,
            estruturas, interface, software, marcas, algoritmos, prompts e recursos técnicos subjacentes.
          </p>
          <p>
            10.3 São vedadas reprodução não autorizada, descompilação, engenharia reversa, extração de código ou
            exploração comercial indevida dos elementos proprietários da Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">11. Uso aceitável e obrigações do Usuário</h2>
          <p>11.1 O Usuário deverá utilizar a Plataforma de boa-fé e apenas para finalidades lícitas, abstendo-se de:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              enviar documentos que não tenha autorização para compartilhar ou processar, inclusive quando
              contenham dados pessoais de terceiros;
            </li>
            <li>empregar a Plataforma para violar direitos de terceiros, a legislação aplicável ou deveres de confidencialidade;</li>
            <li>utilizar automação não autorizada para sobrecarregar ou contornar limites técnicos ou comerciais;</li>
            <li>
              explorar falhas, contornar mecanismos de autenticação, realizar ataques ou inserir instruções
              maliciosas em documentos para manipular o sistema;
            </li>
            <li>compartilhar credenciais, códigos MFA e contas;</li>
            <li>
              burlar restrições de cópia/exportação do Freemium para reproduzir, distribuir ou comercializar
              conteúdos restritos.
            </li>
          </ul>
          <p>
            11.2 A violação das regras poderá resultar em medidas proporcionais, inclusive restrição temporária de
            funcionalidades, suspensão ou encerramento de conta, mediante comunicação quando possível, sem
            prejuízo de providências legais.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">12. Precisão das análises automatizadas</h2>
          <p>
            12.1 Escores, índices, sugestões de redação, prazos e estimativas financeiras são resultados
            computacionais destinados a apoiar a análise humana, não devendo ser interpretados como garantias de
            resultado, certificação da validade jurídica ou decisão definitiva.
          </p>
          <p>
            12.2 Cabe ao Usuário confrontar os resultados com o texto original e com o contexto concreto da
            relação contratual, considerando também normas, jurisprudência e circunstâncias não necessariamente
            contidas no documento enviado.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">13. Disponibilidade, manutenção e suporte</h2>
          <p>
            13.1 A Ponderum empregará esforços razoáveis para manter o serviço disponível, mas poderão ocorrer
            interrupções por manutenção, atualizações, falhas de terceiros ou eventos alheios ao seu controle.
          </p>
          <p>13.2 Não há, nesta versão, garantia contratual de percentual mínimo de disponibilidade (SLA), salvo instrumento separado expressamente firmado com o contratante.</p>

          <h2 className="text-base font-medium text-foreground mt-2">14. Responsabilidade</h2>
          <p>
            14.1 Na extensão permitida pela legislação, a Ponderum não responde por decisões tomadas
            exclusivamente com base nas saídas da inteligência artificial, sem revisão adequada, nem por
            prejuízos resultantes do uso em desconformidade com estes Termos.
          </p>
          <p>
            14.2 Na máxima extensão permitida pela legislação, não se atribuirão à Ponderum lucros cessantes,
            perdas de oportunidades de negócio ou danos indiretos resultantes de uso indevido da Plataforma ou de
            decisões do Usuário tomadas sem a revisão profissional recomendada.
          </p>
          <p>
            14.3 Nenhuma disposição destes Termos afasta responsabilidade por conduta que legalmente não possa ser
            excluída ou limitada, nem restringe direitos assegurados nas relações de consumo, quando existentes.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">15. Suspensão, encerramento de conta e dados</h2>
          <p>
            15.1 O cancelamento de assinatura, a suspensão de acesso e a exclusão de conta são eventos distintos.
            A exclusão da conta pode ser solicitada pelo caminho Configurações {" > "} Privacidade e Dados, quando
            disponível, ou por solicitação ao suporte, conforme as permissões do usuário.
          </p>
          <p>
            15.2 A solicitação de exclusão elimina dados operacionais e documentos associados à conta e à
            organização conforme os fluxos da Plataforma, ressalvados prazos de expurgo de cópias de segurança e a
            conservação de registros exigida por lei, para prestação de contas ou exercício regular de direitos,
            detalhados na Política de Privacidade.
          </p>
          <p>
            15.3 A Ponderum poderá suspender ou encerrar o acesso por descumprimento destes Termos, risco de
            segurança, determinação legal ou inadimplência, respeitadas as condições contratuais e os direitos
            aplicáveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">16. Atualizações destes Termos</h2>
          <p>
            16.1 Alterações relevantes destes Termos serão comunicadas com antecedência mínima de 5 (cinco) dias
            por e-mail e aviso na Plataforma, conforme o compromisso atualmente assumido pela Ponderum,
            ressalvadas situações em que norma imperativa, ordem de autoridade ou medida urgente de segurança
            exija prazo diverso.
          </p>
          <p>
            16.2 Quando a alteração exigir novo aceite expresso, a Plataforma poderá solicitá-lo antes da
            continuidade do uso. Quando juridicamente admissível, a continuidade da utilização após a vigência da
            versão informada poderá representar concordância com as condições atualizadas.
          </p>
          <p>
            16.3 O histórico de versões e a data efetiva da alteração serão disponibilizados ou registrados pelos
            meios aplicáveis. Mudanças não eliminam direitos adquiridos ou obrigações já constituídas.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">17. Lei aplicável e foro</h2>
          <p>17.1 Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
          <p>
            17.2 Fica eleito o foro da Comarca de São Paulo/SP, ressalvadas regras legais de competência e os
            direitos de foro protetivo do consumidor, quando aplicáveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">18. Disposições gerais e contato</h2>
          <p>18.1 A invalidação de uma disposição não compromete as demais. A tolerância à infração não constitui renúncia de direito nem alteração tácita do acordo.</p>
          <p>18.2 Estes Termos, a Política de Privacidade e as condições comerciais expressamente aceitas compõem o conjunto contratual aplicável ao uso da Plataforma.</p>
          <p>18.3 Contato para dúvidas e solicitações contratuais: contato@ponderum.com.br. Sítio eletrônico: https://ponderum.com/.</p>

          <p className="pt-2 text-xs text-muted-foreground">
            Ponderum é uma marca da GVF Serviços de Tecnologia Ltda. © 2026. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
