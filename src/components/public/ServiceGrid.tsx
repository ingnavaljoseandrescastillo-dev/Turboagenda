import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceGridProps {
  services: Service[]
  slug: string
}

export function ServiceGrid({ services, slug }: ServiceGridProps) {
  if (services.length === 0) return null

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-100 mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Serviços</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service) => (
          <div
            key={service.id}
            className="group p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/40 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{service.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                  <span>⏱ {service.duration_minutes} min</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-lg font-bold text-emerald-400" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {formatCurrency(service.price)}
                </p>
                <Link
                  href={`/b/${slug}/book?service=${service.id}`}
                  className="mt-2 inline-block rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 px-3 py-1.5 text-xs font-semibold transition-all"
                >
                  Marcar
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
