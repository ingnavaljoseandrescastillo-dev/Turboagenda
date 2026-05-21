import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import type { FinanceEntry } from '@/types'
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

  return <FinancePanel initialEntries={(data ?? []) as FinanceEntry[]} />
}
