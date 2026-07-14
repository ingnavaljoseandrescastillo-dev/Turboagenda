import type { Metadata, Viewport } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { PwaRuntime } from '@/components/pwa/PwaRuntime'

export const metadata: Metadata = {
  metadataBase: new URL('https://turboagenda.pt'),
  title: {
    default: 'TurboAgenda - Agenda Online para Negocios',
    template: '%s | TurboAgenda',
  },
  description: 'Sistema de agendamento online para peluqueria, spas e outros negocios. Simples, rapido e profissional.',
  applicationName: 'TurboAgenda',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TurboAgenda',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#10b981',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-zinc-950 text-zinc-100"
        style={{ fontFamily: "'Outfit', -apple-system, sans-serif" }}
      >
        {/* Google Fonts loaded via CSS @import in globals.css */}
        <LanguageProvider>
          <PwaRuntime />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
