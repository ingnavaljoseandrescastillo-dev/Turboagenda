import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'

const AppointmentPatchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  notes: z.string().nullable().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  employee_id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) {
      return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)
    }

    const { id } = await params
    const body = await request.json()
    const parsed = AppointmentPatchSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data, error } = await supabase
      .from('appointments')
      .update(parsed.data)
      .eq('id', id)
      .eq('business_id', business.id)
      .select()
      .single()

    if (error) return handleError(error.message, 422)
    return formatResponse(data)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) {
      return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)
    }

    const { id } = await params
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)

    if (error) return handleError(error.message, 422)
    return formatResponse({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}
