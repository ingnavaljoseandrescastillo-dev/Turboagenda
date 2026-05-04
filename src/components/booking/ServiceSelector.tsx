import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceSelectorProps {
  services: Service[]
  selected: string | null
  onSelect: (id: string) => void
  primaryColor?: string
}

export function ServiceSelector({ services, selected, onSelect, primaryColor = '#10b981' }: ServiceSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-zinc-100">Escolha o servico</h3>
      <div className="grid gap-3">
        {services.map((service) => {
          const isSelected = selected === service.id
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
                <div>
                  <p className="font-medium text-zinc-100">{service.name}</p>
                  {service.description && (
                    <p className="mt-0.5 text-sm text-zinc-500">{service.description}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">{service.duration_minutes} min</p>
                </div>
                <p className="ml-4 flex-shrink-0 text-lg font-bold" style={{ color: primaryColor }}>
                  {formatCurrency(service.price)}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
