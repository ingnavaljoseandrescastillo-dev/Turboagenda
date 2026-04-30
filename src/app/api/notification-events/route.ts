import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const { data, error } = await supabase
      .from('notification_events')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return handleError(error.message, 422)
    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}
