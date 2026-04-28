import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types'

interface ServiceSelectorProps {
  services: Service[]
  selected: string | null
  onSelect: (id: string) => void
}

export function ServiceSelector({ services, selected, onSelect }: ServiceSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-zinc-100">Escolha o serviço</h3>
      <div className="grid gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
              selected === service.id
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-zinc-100">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-zinc-500 mt-0.5">{service.description}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">{service.duration_minutes} min</p>
              </div>
              <p className="text-lg font-bold text-emerald-400 flex-shrink-0 ml-4">
                {formatCurrency(service.price)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
