import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { sendAppointmentCancelledEmail } from '@/lib/appointment-emails'

const AppointmentPatchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
  payment_status: z.enum(['approved', 'rejected']).optional(),
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

    const shouldNotifyCancellation = parsed.data.status === 'cancelled' || parsed.data.payment_status === 'rejected'
    const { data: existing, error: existingError } = await supabase
          .from('appointments')
          .select('status, payment_status, deposit_required')
          .eq('id', id)
          .eq('business_id', business.id)
          .maybeSingle()

    if (existingError) return handleError(existingError.message, 422)
    if (!existing) return handleError('Cita nao encontrada', 404)
    if (parsed.data.payment_status && (!existing.deposit_required || existing.payment_status !== 'proof_submitted')) return handleError('Comprovativo nao esta pendente de revisao.', 409)
    if (parsed.data.status === 'confirmed' && existing.deposit_required && existing.payment_status !== 'approved' && parsed.data.payment_status !== 'approved') return handleError('Reveja e aprove o pagamento antes de confirmar.', 422)
    if (parsed.data.payment_status === 'rejected') parsed.data.status = 'cancelled'

    let update = supabase
      .from('appointments')
      .update(parsed.data)
      .eq('id', id)
      .eq('business_id', business.id)
    update = existing.payment_status === null ? update.is('payment_status', null) : update.eq('payment_status', existing.payment_status)
    const { data, error } = await update.select().single()

    if (error) return handleError(error.message, 422)

    if (shouldNotifyCancellation && existing?.status !== 'cancelled') {
      await sendAppointmentCancelledEmail(id)
    }

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
