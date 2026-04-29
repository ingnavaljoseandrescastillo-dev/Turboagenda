import type { NextRequest } from 'next/server'
import { BusinessScheduleSchema } from '@/lib/validators'
import {
  ensureBusinessBootstrapRows,
  formatResponse,
  getBusinessForUser,
  handleError,
  validateAuth,
} from '@/lib/api-helpers'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    await ensureBusinessBootstrapRows(supabase, user.id, business.id)

    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const body = await request.json()
    const parsed = BusinessScheduleSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data, error } = await supabase
      .from('business_settings')
      .update(parsed.data)
      .eq('business_id', business.id)
      .select()
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}
