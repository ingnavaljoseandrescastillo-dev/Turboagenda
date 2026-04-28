'use client'

import { usePathname } from 'next/navigation'
import { getInitials } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Agenda',
  '/dashboard/appointments': 'Agendamentos',
  '/dashboard/services': 'Serviços',
  '/dashboard/team': 'A minha equipa',
  '/dashboard/settings': 'Configurações',
}

interface TopNavProps {
  user?: User | null
  businessName?: string
  dateLabel?: string
}

export function TopNav({ user, businessName, dateLabel }: TopNavProps) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'
  const displayName = businessName ?? user?.email ?? ''

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl px-6">
      <div>
        <h1
          className="text-xl font-bold text-zinc-100"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {title}
        </h1>
        {dateLabel && <p className="text-xs text-zinc-500 mt-0.5">{dateLabel}</p>}
      </div>
      <div className="flex items-center gap-3">
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
