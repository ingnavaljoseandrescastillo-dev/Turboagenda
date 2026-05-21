import type { NextRequest } from 'next/server'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { FinanceEntrySchema } from '@/lib/validators'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negocio no encontrado', 404)

    const body = await request.json()
    const parsed = FinanceEntrySchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data, error } = await supabase
      .from('business_finance_entries')
      .update({
        ...parsed.data,
        category: parsed.data.category.toLowerCase(),
        currency: parsed.data.currency.toUpperCase(),
        notes: parsed.data.notes || null,
        appointment_id: parsed.data.appointment_id || null,
        employee_id: parsed.data.employee_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', business.id)
      .select('*')
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negocio no encontrado', 404)

    const { error } = await supabase
      .from('business_finance_entries')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)

    if (error) return handleError(error.message, 422)
    return formatResponse({ id })
  } catch (err) {
    return handleError(err)
  }
}
