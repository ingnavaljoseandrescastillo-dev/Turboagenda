import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Politica de Cookies | TurboAgenda' }

export default function CookiesPage() {
  return <LegalPage title="Politica de Cookies" subtitle="Cookies e armazenamento local usados pela aplicacao." updatedAt="15 de setembro de 2026" sections={[
    { title: '1. Cookies de autenticacao', body: ['O Supabase utiliza cookies com nomes que comecam por sb- para manter e renovar a sessao e concluir a autenticacao. Podem ser divididos em varios cookies. A validade depende da sessao e da configuracao de autenticacao; terminar sessao remove as credenciais desse navegador. Sao necessarios para funcionalidades autenticadas.'] },
    { title: '2. Preferencias neste dispositivo', body: ['ta_locale guarda o idioma escolhido no armazenamento local. ta_cookie_notice_v1 regista apenas que o aviso foi fechado; nao representa consentimento para publicidade ou analitica. Estas preferencias permanecem ate serem removidas nos dados do navegador.', 'A PWA utiliza um service worker e cache tecnico para o seu funcionamento. As notificacoes push dependem de uma autorizacao separada no navegador e podem ser desativadas nas definicoes do dispositivo.'] },
    { title: '3. Cookies opcionais', body: ['O codigo atual da aplicacao nao integra cookies de analitica ou publicidade. Por isso, o aviso e informativo e nao pede consentimento para essas finalidades. Antes de introduzir tecnologias opcionais, sera necessario disponibilizar escolhas de aceitar, recusar e retirar consentimento, bloqueando essas tecnologias ate uma escolha valida.'] },
    { title: '4. Servicos externos', body: ['As fontes sao atualmente carregadas a partir de Google Fonts, o que implica uma ligacao aos servidores desse fornecedor. Esta ligacao nao e uma funcionalidade de analitica.', 'Ao abrir servicos externos ou escolher autenticacao com Google quando disponivel, aplicam-se tambem as politicas desses fornecedores.'] },
    { title: '5. Controlo e contacto', body: ['Pode remover cookies, preferencias e cache nas definicoes do navegador. Remover ou bloquear cookies essenciais pode terminar a sessao ou impedir o login. O aviso volta a aparecer se eliminar a preferencia correspondente.', 'Para questoes sobre privacidade: ingnavaljoseandrescastillo@gmail.com. Consulte tambem a Politica de Privacidade em /privacidade.'] },
  ]} />
}
