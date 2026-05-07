import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import {
  getBusinessPublicUrl,
  loadClientDetail,
  loadCommunicationSettings,
} from '@/lib/client-management'
import { ClientDetailView } from './ClientDetailView'

export const metadata = { title: 'Cliente - TurboAgenda' }

type PageProps = { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (!business) redirect('/dashboard/onboarding')

  const { id } = await params
  const [client, communication] = await Promise.all([
    loadClientDetail(supabase, business.id, id),
    loadCommunicationSettings(supabase, business.id),
  ])

  if (!client) redirect('/dashboard/clients')

  return (
    <ClientDetailView
      client={client}
      communication={communication}
      publicUrl={getBusinessPublicUrl(business)}
    />
  )
}
