import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Politica de Privacidade | TurboAgenda',
  description: 'Informacao sobre o tratamento de dados pessoais no TurboAgenda.',
}

const sections = [
  {
    title: '1. Ambito desta politica',
    body: [
      'Esta Politica de Privacidade explica como o TurboAgenda trata dados pessoais quando visitantes usam o website, quando negocios criam uma conta e quando clientes finais fazem uma marcacao online atraves de uma pagina publica de um negocio.',
      'O servico e dirigido principalmente a negocios e profissionais que precisam de gerir marcacoes, clientes, colaboradores, servicos e informacao operacional relacionada com a agenda.',
    ],
  },
  {
    title: '2. Responsavel pelo tratamento',
    body: [
      'Responsavel pelo tratamento: TurboAgenda. Dados completos de identificacao, morada, NIF/NIPC e contacto oficial: a completar antes da publicacao final.',
      'Quando um cliente final faz uma marcacao numa pagina de um negocio, esse negocio tambem pode atuar como responsavel pelo tratamento dos dados dos seus proprios clientes. Nessa situacao, o TurboAgenda presta a plataforma tecnica e pode atuar como subcontratante, salvo nos tratamentos necessarios para seguranca, funcionamento, cumprimento legal e defesa dos seus direitos.',
    ],
  },
  {
    title: '3. Dados pessoais que podemos tratar',
    body: [
      'Dados de conta e negocio: nome do negocio, nome ou email do utilizador, telefone, palavra-passe protegida pelo fornecedor de autenticacao, slug publico, morada, descricao do negocio, servicos, colaboradores e configuracoes da agenda.',
      'Dados de marcacao: nome do cliente, email, telefone opcional, servico escolhido, colaborador escolhido, data e hora, estado da marcacao, notas quando existam e historico operacional necessario para gerir a reserva.',
      'Dados tecnicos: endereco IP, data e hora de acesso, navegador, paginas acedidas, identificadores tecnicos de sessao e registos de seguranca ou erro quando necessarios para manter o servico seguro e funcional.',
    ],
  },
  {
    title: '4. Finalidades e bases legais',
    body: [
      'Prestacao do servico: criar contas, autenticar utilizadores, gerir negocios, servicos, colaboradores, disponibilidade e marcacoes. Base legal: execucao de contrato ou diligencias pre-contratuais.',
      'Comunicacoes operacionais: enviar confirmacoes, mensagens de conta, suporte e respostas a pedidos. Base legal: execucao de contrato e interesse legitimo em prestar suporte.',
      'Seguranca, prevencao de abuso e manutencao tecnica: proteger contas, investigar erros, manter registos tecnicos e prevenir utilizacao indevida. Base legal: interesse legitimo e cumprimento de obrigacoes legais aplicaveis.',
      'Obrigacoes legais, fiscais e defesa de direitos: conservar informacao quando exigido por lei ou necessario para resolver disputas. Base legal: cumprimento de obrigacao legal e interesse legitimo.',
    ],
  },
  {
    title: '5. Partilha de dados e fornecedores',
    body: [
      'Podemos recorrer a fornecedores tecnicos para alojamento, base de dados, autenticacao, email, seguranca, suporte e ferramentas de comunicacao. Estes fornecedores apenas devem tratar dados na medida necessaria para prestar esses servicos.',
      'A app usa Supabase para funcionalidades como autenticacao, base de dados e sessoes. Quando o utilizador abre links externos, por exemplo WhatsApp, passa a aplicar-se tambem a politica de privacidade desses terceiros.',
      'Nao vendemos dados pessoais. Dados podem ser divulgados a autoridades competentes quando exista obrigacao legal ou ordem valida.',
    ],
  },
  {
    title: '6. Transferencias internacionais',
    body: [
      'Sempre que fornecedores tratem dados fora do Espaco Economico Europeu, devem ser usados mecanismos adequados de transferencia, como decisoes de adequacao, clausulas contratuais-tipo ou outras garantias previstas no RGPD.',
    ],
  },
  {
    title: '7. Conservacao dos dados',
    body: [
      'Dados de conta e negocio sao conservados enquanto a conta estiver ativa e durante o periodo adicional necessario para cumprimento legal, faturacao, seguranca, resolucao de disputas ou defesa de direitos.',
      'Dados de marcacoes e clientes sao conservados enquanto forem necessarios para a gestao do negocio na plataforma, sem prejuizo de pedidos de apagamento validos ou obrigacoes legais aplicaveis.',
      'Registos tecnicos e de seguranca tendem a ser conservados por periodos limitados, normalmente ate 90 dias, salvo necessidade de investigacao de incidentes, cumprimento legal ou defesa de direitos.',
    ],
  },
  {
    title: '8. Cookies e tecnologias semelhantes',
    body: [
      'Neste momento, o TurboAgenda deve usar apenas cookies ou armazenamento tecnico necessario para login, seguranca, sessao e funcionamento da aplicacao. Estes cookies essenciais nao exigem consentimento previo.',
      'Se forem adicionados cookies de analitica, marketing, publicidade, mapas, chat externo ou outras tecnologias nao essenciais, sera necessario obter consentimento previo, livre e informado, permitindo aceitar, recusar ou alterar preferencias.',
    ],
  },
  {
    title: '9. Direitos dos titulares dos dados',
    body: [
      'Nos termos do RGPD, pode pedir acesso, retificacao, apagamento, limitacao, portabilidade e oposicao ao tratamento dos seus dados, bem como retirar consentimento quando o tratamento dependa de consentimento.',
      'Tambem pode apresentar reclamacao junto da Comissao Nacional de Protecao de Dados (CNPD), em Portugal, se entender que os seus dados nao foram tratados de acordo com a lei.',
    ],
  },
  {
    title: '10. Seguranca',
    body: [
      'Adotamos medidas tecnicas e organizativas destinadas a proteger os dados contra acesso nao autorizado, alteracao, perda, destruicao ou divulgacao indevida. Nenhum sistema e absolutamente imune a risco, mas trabalhamos para reduzir esse risco de forma proporcional.',
    ],
  },
  {
    title: '11. Contacto',
    body: [
      'Contacto para privacidade e exercicio de direitos: a completar antes da publicacao final. Ate la, qualquer pedido deve ser enviado pelo canal de contacto disponibilizado no website ou diretamente ao negocio responsavel pela marcacao, quando o pedido disser respeito a dados tratados por esse negocio.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politica de Privacidade"
      subtitle="Como recolhemos, usamos, conservamos e protegemos dados pessoais no TurboAgenda."
      updatedAt="12 de julho de 2026"
      sections={sections}
    />
  )
}
