import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import { redirect } from 'next/navigation'
import { AgendaManager } from './AgendaManager'
import type { Appointment, BusinessDayOverride, BusinessSettings } from '@/types'

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
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', business.id)
    .maybeSingle()

  const { data: closedDays } = await supabase
    .from('business_day_overrides')
    .select('date, is_closed, opening_time, closing_time, slot_duration_minutes, note')
    .eq('business_id', business.id)
    .gte('date', `${currentMonth}-01`)
    .lte('date', `${currentMonth}-${String(monthEnd.getDate()).padStart(2, '0')}`)
    .order('date')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{appointments.length} agendamentos</p>
      </div>

      <AgendaManager
        appointments={appointments}
        settings={(settings ?? null) as BusinessSettings | null}
        closedDays={(closedDays ?? []) as BusinessDayOverride[]}
      />
    </div>
  )
}
