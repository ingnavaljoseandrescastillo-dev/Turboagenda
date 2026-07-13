import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Termos e Condicoes | TurboAgenda',
  description: 'Termos de utilizacao do servico TurboAgenda.',
}

const sections = [
  {
    title: '1. Identificacao e aceitacao',
    body: [
      'Estes Termos e Condicoes regulam o acesso e utilizacao do TurboAgenda. Dados completos da entidade responsavel pelo servico, morada, NIF/NIPC e contacto oficial: a completar antes da publicacao final.',
      'Ao criar conta, usar a plataforma ou contratar um plano, o utilizador declara que leu e aceita estes termos. Se utiliza o servico em nome de um negocio, declara ter poderes para vincular esse negocio.',
    ],
  },
  {
    title: '2. Descricao do servico',
    body: [
      'O TurboAgenda e uma plataforma de agenda online para negocios, permitindo configurar servicos, colaboradores, disponibilidade, paginas publicas e marcacoes feitas por clientes finais.',
      'Algumas funcionalidades podem estar em fase beta, ser disponibilizadas manualmente ou depender de fornecedores externos, como servicos de autenticacao, base de dados, email ou comunicacao.',
    ],
  },
  {
    title: '3. Conta e seguranca',
    body: [
      'O utilizador deve fornecer informacao verdadeira, atual e completa, manter a confidencialidade das credenciais e comunicar qualquer acesso nao autorizado.',
      'O TurboAgenda pode suspender ou limitar o acesso quando existam indicios razoaveis de abuso, fraude, violacao destes termos, risco de seguranca ou incumprimento legal.',
    ],
  },
  {
    title: '4. Planos, periodo gratis e pagamentos',
    body: [
      'O plano anunciado pode incluir 30 dias gratis e, durante a beta comercial, ativacao manual atraves de contacto direto. As condicoes comerciais exibidas no website ou comunicadas por escrito aplicam-se ao momento da contratacao.',
      'Precos, funcionalidades e disponibilidade dos planos podem ser alterados para novas contratacoes ou renovacoes futuras. Alteracoes materiais serao comunicadas com antecedencia razoavel quando aplicavel.',
      'Quando pagamentos online forem ativados, o processamento podera ser feito por fornecedores terceiros. O utilizador sera informado sobre preco, periodicidade, impostos aplicaveis e metodo de cancelamento antes da cobranca.',
    ],
  },
  {
    title: '5. Marcacoes e relacao com clientes finais',
    body: [
      'Cada negocio e responsavel por configurar corretamente servicos, horarios, colaboradores, disponibilidade, precos e informacao apresentada na sua pagina publica.',
      'O TurboAgenda fornece a infraestrutura tecnica de reserva, mas nao presta os servicos marcados pelos clientes finais. Cancelamentos, atrasos, reembolsos, qualidade do servico presencial e comunicacoes comerciais do negocio sao responsabilidade do negocio que recebe a marcacao.',
    ],
  },
  {
    title: '6. Utilizacao aceitavel',
    body: [
      'Nao e permitido usar o TurboAgenda para atividades ilegais, conteudo enganoso, spam, violacao de direitos de terceiros, tentativa de acesso nao autorizado, sobrecarga da infraestrutura, engenharia reversa proibida ou recolha abusiva de dados.',
      'O utilizador e responsavel pelos dados, textos, imagens, servicos, precos e demais conteudos que inserir na plataforma.',
    ],
  },
  {
    title: '7. Dados pessoais',
    body: [
      'O tratamento de dados pessoais e descrito na Politica de Privacidade. O negocio deve garantir que tem fundamento legal para tratar os dados dos seus clientes e que presta a informacao legal necessaria quando usa a plataforma.',
      'Quando aplicavel, o negocio deve responder a pedidos dos seus clientes sobre acesso, retificacao, apagamento, oposicao ou outros direitos de protecao de dados.',
    ],
  },
  {
    title: '8. Disponibilidade e manutencao',
    body: [
      'Trabalhamos para manter o servico disponivel, seguro e funcional, mas nao garantimos funcionamento ininterrupto ou livre de erros. Podem ocorrer manutencoes, indisponibilidades de fornecedores, falhas tecnicas ou eventos fora do nosso controlo.',
    ],
  },
  {
    title: '9. Propriedade intelectual',
    body: [
      'A plataforma, marca, design, codigo, textos e elementos do TurboAgenda pertencem ao TurboAgenda ou aos seus licenciantes. O utilizador mantem os direitos sobre os conteudos que introduz, concedendo apenas a licenca necessaria para operar e apresentar esses conteudos no servico.',
    ],
  },
  {
    title: '10. Responsabilidade',
    body: [
      'Na medida permitida por lei, o TurboAgenda nao sera responsavel por perdas indiretas, lucros cessantes, perda de negocio, danos reputacionais ou problemas causados por configuracao incorreta do negocio, uso indevido da plataforma ou falhas de fornecedores terceiros.',
      'Nada nestes termos limita direitos que nao possam ser excluidos por lei, incluindo direitos imperativos de consumidores quando sejam aplicaveis.',
    ],
  },
  {
    title: '11. Alteracoes e cessacao',
    body: [
      'Podemos atualizar estes termos para refletir alteracoes legais, tecnicas ou comerciais. A versao atualizada sera publicada nesta pagina com a data de atualizacao.',
      'O utilizador pode deixar de usar o servico e pedir cancelamento da conta ou plano pelos canais disponibilizados. O TurboAgenda pode terminar ou suspender o servico nos casos previstos nestes termos ou pela lei aplicavel.',
    ],
  },
  {
    title: '12. Lei aplicavel e contacto',
    body: [
      'Estes termos sao regidos pela lei portuguesa, sem prejuizo de normas imperativas aplicaveis. Contacto oficial para questoes contratuais: a completar antes da publicacao final.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Termos e Condicoes"
      subtitle="As regras principais para usar o TurboAgenda como plataforma de agenda online para negocios."
      updatedAt="12 de julho de 2026"
      sections={sections}
    />
  )
}
