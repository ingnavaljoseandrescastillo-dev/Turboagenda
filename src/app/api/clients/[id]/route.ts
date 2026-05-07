import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import {
  getBusinessPublicUrl,
  loadClientDetail,
  loadCommunicationSettings,
} from '@/lib/client-management'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const { id } = await params
    const [client, communication] = await Promise.all([
      loadClientDetail(supabase, business.id, id),
      loadCommunicationSettings(supabase, business.id),
    ])

    if (!client) return handleError('Cliente nao encontrado', 404)

    return formatResponse({
      client,
      communication,
      public_url: getBusinessPublicUrl(business),
    })
  } catch (err) {
    return handleError(err)
  }
}
