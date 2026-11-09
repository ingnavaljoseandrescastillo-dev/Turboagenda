import type { NextRequest } from 'next/server'
import { AvailabilityQuerySchema } from '@/lib/validators'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { getInternalAvailableSlots } from '@/lib/internal-availability'

export async function GET(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const parsed = AvailabilityQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Parâmetros inválidos', 400)
    if (parsed.data.business_id !== business.id) return handleError('Negócio inválido', 403)

    const serviceIds = Array.from(new Set(
      parsed.data.service_ids?.split(',').map((id) => id.trim()).filter(Boolean) ?? [parsed.data.service_id]
    ))
    if (serviceIds.length === 0 || serviceIds.length > 12) return handleError('Serviços inválidos', 400)

    const slots = await getInternalAvailableSlots(createAdminClient(), {
      businessId: business.id,
      employeeId: parsed.data.employee_id,
      serviceIds,
      date: parsed.data.date,
    })

    return formatResponse({ slots })
  } catch (error) {
    return handleError(error)
  }
}
