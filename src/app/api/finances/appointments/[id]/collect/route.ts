import type { NextRequest } from 'next/server'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { AppointmentCollectionSchema } from '@/lib/validators'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negocio no encontrado', 404)

    const { id } = await context.params
    const body = await request.json()
    const parsed = AppointmentCollectionSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, business_id, employee_id, client_name, end_time, status, service:services(name)')
      .eq('id', id)
      .eq('business_id', business.id)
      .maybeSingle()

    if (appointmentError) return handleError(appointmentError.message, 422)
    if (!appointment) return handleError('Cita no encontrada', 404)
    if (appointment.status === 'cancelled') return handleError('No se puede cobrar una cita cancelada', 422)
    if (new Date(appointment.end_time) > new Date()) {
      return handleError('Solo puedes confirmar cobros de citas ya realizadas', 422)
    }

    const { data: previousIncome, error: previousIncomeError } = await supabase
      .from('business_finance_entries')
      .select('id')
      .eq('business_id', business.id)
      .eq('appointment_id', appointment.id)
      .eq('type', 'income')
      .maybeSingle()

    if (previousIncomeError) return handleError(previousIncomeError.message, 422)
    if (previousIncome) return handleError('Esta cita ya tiene un cobro registrado', 409)

    const service = Array.isArray(appointment.service) ? appointment.service[0] : appointment.service
    const { data: entry, error: entryError } = await supabase
      .from('business_finance_entries')
      .insert({
        business_id: business.id,
        appointment_id: appointment.id,
        employee_id: appointment.employee_id,
        created_by: user.id,
        type: 'income',
        category: 'servicio',
        description: `${service?.name ?? 'Servicio'} - ${appointment.client_name}`,
        amount_cents: parsed.data.amount_cents,
        gross_amount_cents: parsed.data.gross_amount_cents,
        discount_cents: parsed.data.discount_cents,
        currency: parsed.data.currency.toUpperCase(),
        entry_date: parsed.data.entry_date,
        payment_method: parsed.data.payment_method,
        notes: parsed.data.notes || null,
      })
      .select('*')
      .single()

    if (entryError) return handleError(entryError.message, 422)

    const { error: completionError } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointment.id)
      .eq('business_id', business.id)

    if (completionError) {
      console.error('[CollectAppointment] charge saved but appointment completion failed', completionError)
    }

    return formatResponse(entry, 201)
  } catch (err) {
    return handleError(err)
  }
}
