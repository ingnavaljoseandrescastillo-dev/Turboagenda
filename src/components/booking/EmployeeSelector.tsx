import { getInitials } from '@/lib/utils'
import type { Employee } from '@/types'

interface EmployeeSelectorProps {
  employees: Employee[]
  selected: string | null
  onSelect: (id: string) => void
}

export function EmployeeSelector({ employees, selected, onSelect }: EmployeeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-zinc-100">Escolha o colaborador</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {employees.map((emp) => (
          <button
            key={emp.id}
            type="button"
            onClick={() => onSelect(emp.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              selected === emp.id
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-base font-semibold text-emerald-400">
                {getInitials(emp.name)}
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-100">{emp.name}</p>
              <p className="text-xs text-zinc-500">{emp.role}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
