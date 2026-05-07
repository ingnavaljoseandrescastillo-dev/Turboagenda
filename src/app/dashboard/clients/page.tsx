import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import {
  getBusinessPublicUrl,
  loadClientSummaries,
  loadCommunicationSettings,
} from '@/lib/client-management'
import { ClientsPanel } from './ClientsPanel'

export const metadata = { title: 'Clientes - TurboAgenda' }

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (!business) redirect('/dashboard/onboarding')

  const [clients, communication] = await Promise.all([
    loadClientSummaries(supabase, business.id),
    loadCommunicationSettings(supabase, business.id),
  ])

  return (
    <ClientsPanel
      clients={clients}
      communication={communication}
      publicUrl={getBusinessPublicUrl(business)}
    />
  )
}
