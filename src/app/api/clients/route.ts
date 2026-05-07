import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { loadClientSummaries, loadCommunicationSettings, getBusinessPublicUrl } from '@/lib/client-management'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const [clients, communication] = await Promise.all([
      loadClientSummaries(supabase, business.id),
      loadCommunicationSettings(supabase, business.id),
    ])

    return formatResponse({
      clients,
      communication,
      public_url: getBusinessPublicUrl(business),
    })
  } catch (err) {
    return handleError(err)
  }
}
