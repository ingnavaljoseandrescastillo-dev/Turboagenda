import type { NextRequest } from 'next/server'
import { AppointmentSchema } from '@/lib/validators'
import { formatResponse, handleError, validateAuth, getBusinessForUser } from '@/lib/api-helpers'
import { sendAppointmentCreatedEmails } from '@/lib/appointment-emails'

export async function GET() {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const { data, error } = await supabase
      .from('appointments')
      .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
      .eq('business_id', business.id)
      .order('start_time', { ascending: false })
      .limit(100)

    if (error) return handleError(error.message)

    return formatResponse(data ?? [])
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = AppointmentSchema.safeParse(body)
    if (!parsed.success) {
      return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)
    }

    const { createClient } = await import('@/lib/supabase/server')
    const db = await createClient()

    const { data: business, error: businessError } = await db
      .from('businesses')
      .select('is_paused')
      .eq('id', parsed.data.business_id)
      .maybeSingle()

    if (businessError) return handleError(businessError.message, 500)
    if (business?.is_paused) return handleError('Este negocio no esta aceptando reservas ahora mismo', 422)

    const { data, error } = await db.rpc('create_public_appointment', {
      p_business_id: parsed.data.business_id,
      p_service_id: parsed.data.service_id,
      p_employee_id: parsed.data.employee_id,
      p_client_name: parsed.data.client_name,
      p_client_email: parsed.data.client_email || null,
      p_client_phone: parsed.data.client_phone ?? null,
      p_client_birthdate: parsed.data.client_birthdate || null,
      p_start_time: parsed.data.start_time,
      p_notes: parsed.data.notes ?? null,
    })

    if (error) return handleError(error.message, 422)

    if (typeof data === 'string') await sendAppointmentCreatedEmails(data)

    return formatResponse(data, 201)
  } catch (err) {
    return handleError(err)
  }
}
