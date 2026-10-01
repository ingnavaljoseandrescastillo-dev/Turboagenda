import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import { redirect } from 'next/navigation'
import { DashboardAgenda } from '@/components/dashboard/DashboardAgenda'
import { PublicLinkCard } from '@/components/dashboard/PublicLinkCard'
import { addMonths, startOfMonth, subMonths } from 'date-fns'
import { normalizeTimeZone } from '@/lib/utils'
import type { Appointment, Client, Employee, Service } from '@/types'

async function getDashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (!business) redirect('/dashboard/onboarding')

  const rangeStart = startOfMonth(subMonths(new Date(), 1)).toISOString()
  const rangeEnd = startOfMonth(addMonths(new Date(), 13)).toISOString()
  const [appointmentsResult, servicesResult, employeesResult, clientsResult, settingsResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
      .eq('business_id', business.id)
      .gte('start_time', rangeStart)
      .lt('start_time', rangeEnd)
      .order('start_time')
      .limit(1000),
    supabase
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order')
      .order('name'),
    supabase
      .from('employees')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('clients')
      .select('id, name, email, phone, birthdate')
      .eq('business_id', business.id)
      .order('name')
      .limit(500),
    supabase
      .from('business_settings')
      .select('time_zone')
      .eq('business_id', business.id)
      .maybeSingle(),
  ])

  for (const result of [appointmentsResult, servicesResult, employeesResult, clientsResult, settingsResult]) {
    if (result.error) throw new Error(result.error.message)
  }

  const appts = (appointmentsResult.data ?? []) as Appointment[]
  const visibleAppointments = appts.filter((appointment) => appointment.status !== 'cancelled')
  const timeZone = normalizeTimeZone(settingsResult.data?.time_zone)
  const todayKey = dateKey(new Date(), timeZone)
  const todayAppointments = appts.filter((appointment) => dateKey(new Date(appointment.start_time), timeZone) === todayKey)

  return {
    business,
    appointments: visibleAppointments,
    services: (servicesResult.data ?? []) as Pick<Service, 'id' | 'name' | 'duration_minutes' | 'price'>[],
    employees: (employeesResult.data ?? []) as Pick<Employee, 'id' | 'name'>[],
    clients: (clientsResult.data ?? []) as Pick<Client, 'id' | 'name' | 'email' | 'phone' | 'birthdate'>[],
    timeZone,
    metrics: {
      total: todayAppointments.length,
      pending: todayAppointments.filter((a) => a.status === 'pending').length,
      confirmed: todayAppointments.filter((a) => a.status === 'confirmed' || a.status === 'completed').length,
      cancelled: todayAppointments.filter((a) => a.status === 'cancelled').length,
    },
  }
}

export default async function DashboardPage() {
  const { business, appointments, services, employees, clients, timeZone, metrics } = await getDashboardData()

  const kpiCards = metrics ? [
    { label: 'Marcações hoje', value: String(metrics.total), icon: '📅' },
    { label: 'Pendentes', value: String(metrics.pending), icon: '⏰' },
    { label: 'Concluídas', value: String(metrics.confirmed), icon: '✅' },
    { label: 'Canceladas', value: String(metrics.cancelled), icon: '❌' },
  ] : []

  return (
    <div className="space-y-5">
      <PublicLinkCard slug={business.slug} />

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

      <DashboardAgenda
        businessId={business.id}
        appointments={appointments}
        services={services}
        employees={employees}
        clients={clients}
        timeZone={timeZone}
      />
    </div>
  )
}

function dateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
