import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import { redirect } from 'next/navigation'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { formatDate } from '@/lib/utils'
import { parseISO } from 'date-fns'
import type { Appointment } from '@/types'

export const metadata = { title: 'Agendamentos - TurboAgenda' }

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (!business) redirect('/dashboard/onboarding')

  const { data } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
    .eq('business_id', business.id)
    .order('start_time', { ascending: false })
    .limit(100)

  const appointments = (data ?? []) as Appointment[]

  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, a) => {
    const key = a.start_time.slice(0, 10)
    ;(acc[key] ??= []).push(a)
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{appointments.length} agendamentos</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center">
          <div className="text-3xl mb-3">[]</div>
          <p className="text-zinc-500 text-sm">Ainda nao ha agendamentos</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, appts]) => (
          <div key={date}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
              {formatDate(parseISO(date).toISOString())} - {date}
            </h3>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
              {appts.map((a) => (
                <AppointmentCard key={a.id} appointment={a} showActions />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
