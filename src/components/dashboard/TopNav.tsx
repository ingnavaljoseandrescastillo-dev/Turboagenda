'use client'

import { usePathname } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import type { User } from '@supabase/supabase-js'

const pageTitleKeys: Record<string, 'calendar' | 'appointments' | 'services' | 'team' | 'settings'> = {
  '/dashboard': 'calendar',
  '/dashboard/appointments': 'appointments',
  '/dashboard/services': 'services',
  '/dashboard/team': 'team',
  '/dashboard/settings': 'settings',
}

interface TopNavProps {
  user?: User | null
  businessName?: string
  dateLabel?: string
}

export function TopNav({ user, businessName, dateLabel }: TopNavProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const nav = t.dashboard.nav
  const titleKey = pageTitleKeys[pathname]
  const title = titleKey ? nav[titleKey] : nav.fallbackTitle
  const displayName = businessName ?? user?.email ?? ''

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-3 border-b border-zinc-800/60 bg-zinc-950/80 px-4 backdrop-blur-xl md:px-6">
      <div className="min-w-0">
        <h1
          className="truncate text-lg font-bold text-zinc-100 md:text-xl"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {title}
        </h1>
        {dateLabel && <p className="text-xs text-zinc-500 mt-0.5">{dateLabel}</p>}
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="block">
          <LanguageSwitcher compact />
        </div>
        {businessName && (
          <span className="text-sm text-zinc-500 hidden sm:block">{businessName}</span>
        )}
        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-950">
            {getInitials(displayName)}
          </span>
        </div>
      </div>
    </header>
  )
}
