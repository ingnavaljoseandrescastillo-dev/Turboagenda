import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { Calendar } from '@/components/dashboard/Calendar'
import { startOfDay, endOfDay } from 'date-fns'
import type { Appointment } from '@/types'

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ownerData } = await supabase
    .from('business_owners')
    .select('business_id')
    .eq('user_id', user.id)
    .single()

  if (!ownerData) return { appointments: [], metrics: null }

  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  const { data } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
    .eq('business_id', ownerData.business_id)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time')

  const appts = (data ?? []) as Appointment[]

  return {
    appointments: appts,
    metrics: {
      total: appts.length,
      pending: appts.filter((a) => a.status === 'pending').length,
      confirmed: appts.filter((a) => a.status === 'confirmed' || a.status === 'completed').length,
      cancelled: appts.filter((a) => a.status === 'cancelled').length,
    },
  }
}

export default async function DashboardPage() {
  const { appointments, metrics } = await getDashboardData()

  const kpiCards = metrics ? [
    { label: 'Marcações hoje', value: String(metrics.total), icon: '📅' },
    { label: 'Pendentes', value: String(metrics.pending), icon: '⏰' },
    { label: 'Concluídas', value: String(metrics.confirmed), icon: '✅' },
    { label: 'Canceladas', value: String(metrics.cancelled), icon: '❌' },
  ] : []

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{kpi.icon}</span>
                <span className="text-xs text-zinc-500">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Appointment list */}
        <div className="xl:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Marcações de hoje</h3>
              <span className="text-xs text-zinc-500">{appointments.length} total</span>
            </div>
            {appointments.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-3">📅</div>
                <p className="text-zinc-500 text-sm">Sem marcações para hoje</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {appointments.map((a) => (
                  <AppointmentCard key={a.id} appointment={a} showActions />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <Calendar appointments={appointments} />
        </div>
      </div>
    </div>
  )
}
