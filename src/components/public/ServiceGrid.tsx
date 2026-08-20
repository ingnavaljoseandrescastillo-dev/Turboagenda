'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatCurrency, intlLocaleFromAppLocale, type AppLocale } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceGridProps {
  services: Service[]
  slug: string
  primaryColor?: string
  currency?: string
  locale?: AppLocale
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
  locale = 'pt',
  labels = { title: 'Servicos', book: 'Marcar' },
}: ServiceGridProps) {
  const groups = useMemo(() => groupServices(services), [services])
  const hasCategories = groups.some((group) => group.id !== 'all' && group.id !== 'uncategorized')
  const [activeGroup, setActiveGroup] = useState('all')
  const visibleServices = hasCategories
    ? groups.find((group) => group.id === activeGroup)?.services ?? services
    : services

  if (services.length === 0) return null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-100" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          {labels.title}
        </h2>
      </div>
      {hasCategories && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroup(group.id)}
              className="whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-all hover:brightness-110"
              style={{
                borderColor: activeGroup === group.id ? primaryColor : '#3f3f46',
                backgroundColor: activeGroup === group.id ? `${primaryColor}24` : 'rgba(24,24,27,0.8)',
                color: activeGroup === group.id ? primaryColor : '#d4d4d8',
              }}
            >
              {group.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleServices.map((service) => (
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
                  {formatCurrency(service.price, currency, intlLocaleFromAppLocale(locale))}
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

function groupServices(services: Service[]) {
  const categoryMap = new Map<string, { id: string; name: string; order: number; services: Service[] }>()
  const uncategorized: Service[] = []

  for (const service of services) {
    const category = service.service_category
    if (!category || !service.service_category_id) {
      uncategorized.push(service)
      continue
    }

    const group = categoryMap.get(category.id) ?? {
      id: category.id,
      name: category.name,
      order: category.display_order ?? 0,
      services: [],
    }
    group.services.push(service)
    categoryMap.set(category.id, group)
  }

  const groups = Array.from(categoryMap.values())
    .filter((group) => group.services.length > 0)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

  if (uncategorized.length > 0) {
    groups.push({ id: 'uncategorized', name: 'Outros', order: 9999, services: uncategorized })
  }

  return [{ id: 'all', name: 'Todos', order: -1, services }, ...groups]
}
