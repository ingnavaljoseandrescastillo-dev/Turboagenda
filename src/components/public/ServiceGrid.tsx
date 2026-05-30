import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceGridProps {
  services: Service[]
  slug: string
  primaryColor?: string
  currency?: string
  labels?: {
    title: string
    book: string
  }
}

export function ServiceGrid({
  services,
  slug,
  primaryColor = '#10b981',
  currency = 'EUR',
  labels = { title: 'Servicos', book: 'Marcar' },
}: ServiceGridProps) {
  if (services.length === 0) return null

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-zinc-100" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
        {labels.title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="group rounded-2xl border bg-zinc-900/50 p-5 transition-all hover:brightness-110"
            style={{ borderColor: `${primaryColor}40` }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 transition-opacity group-hover:opacity-90">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{service.description}</p>
                )}
                <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                  <span>{service.duration_minutes} min</span>
                </div>
              </div>
              <div className="ml-3 flex-shrink-0 text-right">
                <p className="text-lg font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: primaryColor }}>
                  {formatCurrency(service.price, currency)}
                </p>
                <Link
                  href={`/b/${slug}/book?service=${service.id}`}
                  className="mt-2 inline-block rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: `${primaryColor}24`, color: primaryColor }}
                >
                  {labels.book}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
