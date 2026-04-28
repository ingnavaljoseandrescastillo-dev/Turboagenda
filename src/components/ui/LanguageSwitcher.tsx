'use client'

import { LOCALES } from '@/i18n/translations'
import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            locale === l.code
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
          }`}
          title={l.label}
        >
          <span>{l.flag}</span>
          {!compact && <span>{l.label}</span>}
        </button>
      ))}
    </div>
  )
}
