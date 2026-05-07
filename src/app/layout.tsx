import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'TurboAgenda — Agenda Online para Negócios',
  description: 'Sistema de agendamento online para peluquería, spas e outros negócios. Simples, rápido e profissional.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Outfit', -apple-system, sans-serif" }}>
        {/* Google Fonts loaded via CSS @import in globals.css */}
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <SpeedInsights />
      </body>
    </html>
  )
}
