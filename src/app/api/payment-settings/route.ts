import type { NextRequest } from 'next/server'
import { PaymentSettingsSchema } from '@/lib/validators'
import {
  ensureBusinessBootstrapRows,
  formatResponse,
  getBusinessForUser,
  handleError,
  validateAuth,
} from '@/lib/api-helpers'

export async function PATCH(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    await ensureBusinessBootstrapRows(supabase, user.id, business.id)

    const body = await request.json()
    const parsed = PaymentSettingsSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data, error } = await supabase
      .from('business_settings')
      .update({
        deposit_required_enabled: parsed.data.deposit_required_enabled,
        deposit_percent: parsed.data.deposit_percent,
        deposit_mbway_phone: parsed.data.deposit_mbway_phone?.trim() || null,
      })
      .eq('business_id', business.id)
      .select()
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}
