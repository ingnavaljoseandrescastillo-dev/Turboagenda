import { formatCurrency, intlLocaleFromAppLocale, type AppLocale } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceSelectorProps {
  services: Service[]
  selected: string | string[] | null
  onSelect: (id: string) => void
  primaryColor?: string
  currency?: string
  locale?: AppLocale
  title?: string
  multiple?: boolean
  summaryLabel?: string
}

export function ServiceSelector({
  services,
  selected,
  onSelect,
  primaryColor = '#10b981',
  currency = 'EUR',
  locale = 'pt',
  title = 'Escolha o servico',
  multiple = false,
  summaryLabel = 'Total selecionado',
}: ServiceSelectorProps) {
  const selectedIds = Array.isArray(selected) ? selected : selected ? [selected] : []
  const selectedServices = services.filter((service) => selectedIds.includes(service.id))
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price ?? 0), 0)

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        {multiple && (
          <p className="mt-1 text-sm text-zinc-500">
            Selecione um ou mais servicos para a mesma marcacao.
          </p>
        )}
      </div>
      <div className="grid gap-3">
        {services.map((service) => {
          const isSelected = selectedIds.includes(service.id)
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelect(service.id)}
              className="w-full rounded-xl border p-4 text-left transition-all hover:brightness-110"
              style={{
                borderColor: isSelected ? primaryColor : '#27272a',
                backgroundColor: isSelected ? `${primaryColor}18` : '#18181b',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-100">{service.name}</p>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-zinc-500">{service.description}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">{service.duration_minutes} min</p>
                </div>
                <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                  <p className="text-lg font-bold" style={{ color: primaryColor }}>
                    {formatCurrency(service.price, currency, intlLocaleFromAppLocale(locale))}
                  </p>
                  {multiple && (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold"
                      style={{
                        borderColor: isSelected ? primaryColor : '#3f3f46',
                        color: isSelected ? primaryColor : '#71717a',
                      }}
                    >
                      {isSelected ? 'OK' : '+'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      {multiple && selectedServices.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-300">
          <div className="flex items-center justify-between gap-3">
            <span>{summaryLabel}</span>
            <strong style={{ color: primaryColor }}>
              {totalDuration} min - {formatCurrency(totalPrice, currency, intlLocaleFromAppLocale(locale))}
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}
