import { getInitials } from '@/lib/utils'
import type { Employee } from '@/types'

interface EmployeeSelectorProps {
  employees: Employee[]
  selected: string | null
  onSelect: (id: string) => void
  primaryColor?: string
}

export function EmployeeSelector({ employees, selected, onSelect, primaryColor = '#10b981' }: EmployeeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-zinc-100">Escolha o colaborador</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {employees.map((emp) => {
          const isSelected = selected === emp.id
          return (
            <button
              key={emp.id}
              type="button"
              onClick={() => onSelect(emp.id)}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:brightness-110"
              style={{
                borderColor: isSelected ? primaryColor : '#27272a',
                backgroundColor: isSelected ? `${primaryColor}18` : '#18181b',
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border"
                style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}4d` }}
              >
                <span className="text-base font-semibold" style={{ color: primaryColor }}>
                  {getInitials(emp.name)}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-100">{emp.name}</p>
                <p className="text-xs text-zinc-500">{emp.role}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
