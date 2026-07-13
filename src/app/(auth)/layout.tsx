'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <Logo size="lg" />
          </div>
          <p className="text-sm text-zinc-500">{t.auth.tagline}</p>
          <div className="flex justify-center mt-3">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur p-8 shadow-2xl">
          {children}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-600">
          <span>© 2026 TurboAgenda</span>
          <Link href="/privacidade" className="transition-colors hover:text-zinc-400">
            Privacidade
          </Link>
          <Link href="/termos" className="transition-colors hover:text-zinc-400">
            Termos
          </Link>
        </div>
      </div>
    </div>
  )
}
