import { formatTime, getInitials } from '@/lib/utils'
import type { Appointment } from '@/types'

interface AppointmentCardProps {
  appointment: Appointment
  showActions?: boolean
}

const empColors = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6']

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return empColors[Math.abs(h) % empColors.length]
}

export function AppointmentCard({ appointment, showActions }: AppointmentCardProps) {
  const empColor = appointment.employee ? hashColor(appointment.employee.name) : '#34d399'

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition">
      <div className="text-center min-w-[55px]">
        <div className="text-lg font-bold text-zinc-100" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
          {formatTime(appointment.start_time)}
        </div>
        <div className="text-xs text-zinc-500">{formatTime(appointment.end_time)}</div>
      </div>

      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm"
        style={{ background: empColor + '25', color: empColor }}
      >
        {getInitials(appointment.client_name)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-zinc-100">{appointment.client_name}</div>
        <div className="text-xs text-zinc-400 truncate">{appointment.service?.name ?? 'Serviço'}</div>
        {appointment.employee && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: empColor }} />
            <span className="text-[10px] text-zinc-500">{appointment.employee.name}</span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {showActions && appointment.status === 'pending' && (
          <div className="flex gap-1.5">
            <button className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">
              ✓
            </button>
            <button className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
              ✕
            </button>
          </div>
        )}
        {appointment.status === 'completed' && (
          <span className="px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">✓ OK</span>
        )}
        {appointment.status === 'cancelled' && (
          <span className="px-2.5 py-1.5 bg-zinc-800 text-zinc-500 rounded-lg text-xs font-semibold">Cancelada</span>
        )}
        {appointment.status === 'pending' && !showActions && (
          <span className="px-2.5 py-1.5 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-semibold">Pendente</span>
        )}
        {appointment.status === 'confirmed' && (
          <span className="px-2.5 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-semibold">Confirmado</span>
        )}
      </div>
    </div>
  )
}
