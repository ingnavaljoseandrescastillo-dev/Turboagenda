import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import type { Appointment, FinanceEntry } from '@/types'
import { FinancePanel } from './FinancePanel'

export const metadata = { title: 'Finanzas - TurboAgenda' }

export default async function FinancesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (!business) redirect('/dashboard/onboarding')

  const { data, error } = await supabase
    .from('business_finance_entries')
    .select('*')
    .eq('business_id', business.id)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('[FinancesPage] could not load finance entries', error)
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
    .eq('business_id', business.id)
    .lt('end_time', new Date().toISOString())
    .neq('status', 'cancelled')
    .order('start_time', { ascending: false })
    .limit(180)

  if (appointmentsError) {
    console.error('[FinancesPage] could not load past appointments', appointmentsError)
  }

  return (
    <FinancePanel
      initialEntries={(data ?? []) as FinanceEntry[]}
      pastAppointments={(appointments ?? []) as Appointment[]}
      businessCurrency={business.currency ?? 'EUR'}
    />
  )
}
