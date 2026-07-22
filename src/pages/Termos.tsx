import { Link } from "react-router-dom";

export default function Termos() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="https://ponderum.com" className="text-sm text-primary hover:underline">
          ← Voltar
        </a>

        <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground/90">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Termos de Uso</h1>
          <p className="text-xs text-muted-foreground">
            Ponderum — plataforma de inteligência contratual · Última atualização: 04 de julho de 2026
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">1. Aceitação dos Termos</h2>
          <p>
            1.1 Estes Termos de Uso ("Termos") regulam o acesso e a utilização da plataforma Ponderum
            ("Plataforma" ou "Ponderum"), de titularidade da GVF Serviços de Tecnologia Ltda., sociedade
            empresária inscrita no CNPJ nº 68.051.706/0001-16, com sede na Av. Manoel dos Santos Braga, nº 736,
            Vila Monte Santo, CEP 08062-010, São Paulo/SP ("Ponderum", "nós" ou "Controladora").
          </p>
          <p>
            1.2 Ao criar uma conta, marcar a caixa de aceite no cadastro e/ou utilizar a Plataforma, o usuário
            ("Usuário" ou "você") declara ter lido, compreendido e aceitado integralmente estes Termos e a{" "}
            <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>,
            que a eles se integra por referência.
          </p>
          <p>
            1.3 Caso não concorde com qualquer disposição destes Termos, o Usuário não deve criar conta nem
            utilizar a Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">2. Descrição do Serviço e Limitações</h2>
          <p>
            2.1 O Ponderum é uma plataforma de software como serviço (SaaS) que permite o envio de contratos
            para análise automatizada por inteligência artificial, com o objetivo de identificar cláusulas de
            risco, sugerir alternativas de mitigação e organizar prazos e obrigações contratuais.
          </p>
          <p>2.2 O Ponderum também oferece a geração de minutas contratuais a partir de modelos (templates) predefinidos.</p>
          <p>
            2.3 O Ponderum <strong>NÃO</strong> presta serviços de advocacia, não emite pareceres jurídicos, não
            garante a validade jurídica dos contratos analisados ou gerados, e não substitui a avaliação de
            advogado habilitado. As saídas da Plataforma — incluindo score de risco, cláusulas identificadas,
            sugestões de mitigação e estimativas de impacto financeiro — são estimativas geradas por
            inteligência artificial e devem ser revisadas por profissional habilitado antes de qualquer decisão
            jurídica, negocial ou de assinatura.
          </p>
          <p>
            2.4 Toda minuta gerada pela Plataforma traz o aviso: "Este documento foi gerado pelo Ponderum com
            base em modelos padrão de mercado. Recomendamos revisão por advogado habilitado antes da
            assinatura." Esse aviso não pode ser removido pelo Usuário e integra a própria minuta.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">3. Elegibilidade</h2>
          <p>
            3.1 O uso do Ponderum é destinado exclusivamente a pessoas jurídicas e a profissionais maiores de 18
            (dezoito) anos, atuando em nome próprio ou em nome de organização à qual estejam vinculados.
          </p>
          <p>
            3.2 Ao se cadastrar, o Usuário declara e garante possuir capacidade civil plena e, quando aplicável,
            poderes para vincular a organização em nome da qual atua.
          </p>
          <p>
            3.3 O Ponderum não coleta intencionalmente dados de menores de idade e poderá excluir, a qualquer
            tempo e sem aviso prévio, contas identificadas como pertencentes a menores.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">4. Cadastro, Conta e Organização</h2>
          <p>
            4.1 O cadastro poderá ser realizado por e-mail e senha ou por meio de login federado via Google
            (OAuth 2.0). Independentemente do método escolhido, a criação da conta exige o aceite expresso
            destes Termos e da Política de Privacidade mediante marcação de caixa de confirmação, permanecendo
            o botão de cadastro desabilitado até que o aceite seja manifestado.
          </p>
          <p>
            4.2 Cada conta está vinculada a uma organização. Uma organização pode conter múltiplos Usuários
            ("Membros"), havendo ao menos um Usuário com papel de Administrador, responsável por gerenciar o
            acesso dos demais Membros.
          </p>
          <p>
            4.3 Os dados e contratos de uma organização são isolados e não são acessíveis por Membros de outras
            organizações.
          </p>
          <p>
            4.4 O Usuário é responsável por manter a confidencialidade de suas credenciais de acesso e por todas
            as atividades realizadas em sua conta. O Administrador de cada organização é responsável por
            gerenciar adequadamente o acesso de seus Membros, incluindo a revogação de acesso quando cessado o
            vínculo entre o Membro e a organização.
          </p>
          <p>
            4.5 O Usuário compromete-se a fornecer informações verdadeiras, completas e atualizadas no cadastro,
            incluindo nome completo, e-mail, nome da organização e, quando aplicável, CNPJ ou CPF e setor de
            atuação.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">5. Planos e Limites de Uso</h2>
          <p>
            5.1 O Ponderum é oferecido nos seguintes planos, cujas condições comerciais podem ser atualizadas
            mediante aviso prévio nos termos da Cláusula 12:
          </p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>
              <strong>Plano Freemium (gratuito):</strong> exige cadastro completo nos termos da Cláusula 4,
              dispensada apenas a indicação de forma de pagamento, e permite o envio de 1 (um) contrato para
              análise experimental por conta cadastrada, sem exportação de relatório, sem funcionalidade de
              cópia do conteúdo analisado, e com medidas técnicas destinadas a dificultar a captura de tela do
              resultado;
            </li>
            <li>
              <strong>Plano Starter:</strong> R$ 490,00 (quatrocentos e noventa reais) por mês, com até 15
              (quinze) contratos analisados por mês e até 3 (três) usuários por organização;
            </li>
            <li>
              <strong>Plano Pro:</strong> análises ilimitadas, mediante pagamento de mensalidade [valor a
              definir durante o período de MVP];
            </li>
            <li><strong>Plano Enterprise:</strong> condições específicas a serem definidas mediante contratação direta.</li>
          </ul>
          <p>
            5.2 As medidas técnicas do Plano Freemium destinadas a dificultar a cópia ou a captura de tela do
            conteúdo analisado constituem mecanismo de dificultação, não de impedimento absoluto, dadas as
            limitações inerentes a qualquer solução técnica dessa natureza. A tentativa de contornar essas
            medidas, ou de copiar, reproduzir, fotografar, capturar ou redistribuir por qualquer meio o conteúdo
            gerado no Plano Freemium, constitui violação ao Uso Aceitável (Cláusula 7) e sujeita o Usuário à
            suspensão ou ao encerramento da conta, sem prejuízo de outras medidas cabíveis.
          </p>
          <p>
            5.3 Durante o período de validação inicial da Plataforma ("MVP"), os Usuários participantes do
            programa piloto terão limite temporário de 10 (dez) contratos analisados por mês no Plano Starter,
            ampliado automaticamente para 15 (quinze) contratos por mês ao final do MVP, sem qualquer alteração
            no valor mensal.
          </p>
          <p>
            5.4 Aos Usuários que aderirem ao Plano Starter durante o MVP, o valor de R$ 490,00 mensais será
            mantido enquanto a respectiva conta permanecer ativa e adimplente, ainda que o valor comercial do
            Plano Starter venha a ser revisado para novos contratantes após o lançamento oficial da Plataforma.
          </p>
          <p>
            5.5 Usuários do Plano Starter que optarem por migrar para o Plano Pro farão jus a desconto sobre o
            valor vigente do Plano Pro à época da migração, em percentual e condições a serem definidos pelo
            Ponderum.
          </p>
          <p>
            5.6 Os valores dos planos Pro e Enterprise serão definidos durante o período de MVP e comunicados
            aos Usuários com antecedência. Estes Termos serão atualizados antes do lançamento oficial da
            Plataforma para refletir a precificação definitiva desses planos.
          </p>
          <p>
            5.7 O Ponderum poderá limitar tecnicamente o volume de uso conforme o plano contratado, inclusive
            suspendendo temporariamente novas análises até a renovação do ciclo de cobrança ou upgrade de plano.
          </p>
          <p>
            5.8 Os tipos e tamanhos de arquivo aceitos pela Plataforma são: PDF (até 32 MB), Word/.docx (até 50
            MB) e imagens JPG/PNG de documentos digitalizados (até 5 MB). Esses limites podem ser alterados a
            critério do Ponderum, mediante comunicação na própria Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">6. Propriedade Intelectual</h2>
          <p>
            6.1 <strong>Contratos e arquivos enviados pelo Usuário.</strong> Os contratos, arquivos e demais
            conteúdos enviados pelo Usuário à Plataforma para análise permanecem de titularidade exclusiva do
            Usuário ou da organização a que pertençam. O Ponderum não adquire qualquer direito de propriedade
            sobre esse conteúdo, utilizando-o exclusivamente para a prestação do serviço contratado, nos termos
            da Política de Privacidade.
          </p>
          <p>
            6.2 <strong>Minutas geradas pela Plataforma.</strong> As minutas contratuais geradas a partir de
            modelos (templates) do Ponderum são disponibilizadas ao Usuário para seu uso, observado o aviso
            legal da Cláusula 2.4. Os modelos e templates subjacentes, enquanto estrutura, redação-padrão e
            sistema de geração, permanecem de titularidade do Ponderum; o documento final gerado e preenchido
            com as informações do Usuário pode ser livremente utilizado por este para os fins a que se destina.
          </p>
          <p>
            6.3 <strong>Propriedade do Ponderum.</strong> A marca Ponderum, o software, a interface, os
            algoritmos, os modelos de prompt, a documentação e demais elementos técnicos da Plataforma são de
            titularidade exclusiva da GVF Serviços de Tecnologia Ltda. ou de seus licenciantes, sendo vedada sua
            reprodução, engenharia reversa, descompilação ou uso não autorizado.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">7. Uso Aceitável</h2>
          <p>7.1 O Usuário compromete-se a não:</p>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros;</li>
            <li>enviar contratos ou documentos cujo conteúdo o Usuário não esteja autorizado a compartilhar ou processar;</li>
            <li>
              tentar manipular, contornar ou explorar vulnerabilidades da inteligência artificial da Plataforma,
              incluindo por meio de instruções inseridas no conteúdo dos documentos enviados (prompt injection);
            </li>
            <li>realizar engenharia reversa, descompilação ou tentativa de extração do código-fonte ou dos modelos utilizados pela Plataforma;</li>
            <li>sobrecarregar deliberadamente a infraestrutura da Plataforma ou utilizá-la de forma automatizada sem autorização prévia;</li>
            <li>compartilhar suas credenciais de acesso com terceiros não autorizados;</li>
            <li>
              contornar, tentar contornar ou utilizar meios técnicos — incluindo capturas de tela, fotografia da
              tela, extensões de navegador ou ferramentas de terceiros — para copiar, reproduzir ou redistribuir
              o conteúdo gerado no Plano Freemium, em violação à Cláusula 5.2.
            </li>
          </ul>
          <p>
            7.2 O descumprimento desta cláusula autoriza o Ponderum a suspender ou encerrar a conta do Usuário,
            sem prejuízo de outras medidas cabíveis.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">8. Natureza das Análises Geradas por Inteligência Artificial</h2>
          <p>
            8.1 As análises realizadas pela Plataforma — incluindo score de risco, identificação de cláusulas,
            sugestões de mitigação e estimativas de impacto financeiro em moeda corrente — são geradas por
            sistema de inteligência artificial e constituem estimativas de apoio à decisão, não configurando
            parecer jurídico, garantia de resultado ou substituto da análise de advogado habilitado.
          </p>
          <p>
            8.2 O Ponderum não garante a completude, exatidão ou ausência de erros nas análises geradas,
            incluindo a possibilidade de identificação incorreta, omissão de riscos relevantes ou interpretação
            inadequada de cláusulas (falsos positivos e falsos negativos).
          </p>
          <p>
            8.3 Cabe exclusivamente ao Usuário, com apoio de profissional habilitado quando necessário, a
            decisão final sobre a celebração, alteração ou rejeição de qualquer contrato analisado ou gerado
            pela Plataforma.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">9. Disponibilidade do Serviço</h2>
          <p>
            9.1 O Ponderum envidará esforços razoáveis para manter a Plataforma disponível, porém não garante
            disponibilidade ininterrupta (uptime), podendo ocorrer indisponibilidades temporárias para
            manutenção, atualização ou por motivos alheios à sua vontade.
          </p>
          <p>9.2 Não há, neste momento, acordo de nível de serviço (SLA) formalizado quanto a percentuais mínimos de disponibilidade.</p>

          <h2 className="text-base font-medium text-foreground mt-2">10. Limitação de Responsabilidade</h2>
          <p>
            10.1 Na máxima extensão permitida pela legislação aplicável, o Ponderum não será responsável por
            danos indiretos, lucros cessantes, perda de dados ou de oportunidade de negócio decorrentes do uso
            ou da impossibilidade de uso da Plataforma.
          </p>
          <p>
            10.2 O Ponderum não será responsável por decisões tomadas pelo Usuário com base exclusivamente nas
            análises geradas pela Plataforma, sem a devida revisão por profissional habilitado.
          </p>
          <p>
            10.3 Nada nestes Termos exclui ou limita responsabilidade nos casos em que a lei brasileira vede tal
            exclusão ou limitação, incluindo os direitos assegurados pelo Código de Defesa do Consumidor, quando
            aplicável.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">11. Rescisão e Exclusão de Conta</h2>
          <p>
            11.1 O Usuário pode encerrar sua conta a qualquer momento por meio da funcionalidade disponível em
            Configurações {'>'} Privacidade e Dados, o que implica a exclusão completa e irreversível dos dados
            associados à conta, incluindo contratos, análises, arquivos e demais informações da organização, nos
            termos da Política de Privacidade.
          </p>
          <p>
            11.2 O Ponderum poderá suspender ou encerrar a conta do Usuário, mediante notificação, em caso de
            descumprimento destes Termos, uso indevido da Plataforma ou por determinação legal ou judicial.
          </p>
          <p>
            11.3 As disposições que, por sua natureza, devam subsistir ao encerramento da conta (incluindo
            propriedade intelectual e limitação de responsabilidade) permanecerão vigentes.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">12. Alterações destes Termos</h2>
          <p>
            12.1 O Ponderum poderá alterar estes Termos a qualquer tempo, comprometendo-se a comunicar o Usuário
            com antecedência mínima de 5 (cinco) dias, por e-mail e por aviso na própria Plataforma, antes da
            entrada em vigor das alterações.
          </p>
          <p>
            12.2 A manutenção do uso da Plataforma após a entrada em vigor das alterações constitui aceite
            tácito das novas condições. Caso o Usuário não concorde com as alterações, poderá encerrar sua conta
            nos termos da Cláusula 11.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">13. Legislação Aplicável e Foro</h2>
          <p>13.1 Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
          <p>
            13.2 Fica eleito o foro da comarca de São Paulo, Estado de São Paulo, para dirimir quaisquer
            controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que
            seja, ressalvadas as hipóteses de foro de eleição vedadas pela legislação consumerista, quando
            aplicável.
          </p>

          <h2 className="text-base font-medium text-foreground mt-2">14. Disposições Gerais</h2>
          <p>14.1 Caso qualquer disposição destes Termos seja considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor.</p>
          <p>14.2 A tolerância quanto ao eventual descumprimento de qualquer disposição destes Termos não constituirá novação ou renúncia ao direito de exigir seu cumprimento.</p>
          <p>14.3 Estes Termos, em conjunto com a Política de Privacidade, constituem o acordo integral entre o Usuário e o Ponderum quanto ao objeto aqui tratado.</p>

          <h2 className="text-base font-medium text-foreground mt-2">15. Contato</h2>
          <p>15.1 Dúvidas sobre estes Termos podem ser encaminhadas para contato@ponderum.com.</p>

          <p className="pt-2 text-xs text-muted-foreground">
            Ponderum é uma marca da GVF Serviços de Tecnologia Ltda. © 2026. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
