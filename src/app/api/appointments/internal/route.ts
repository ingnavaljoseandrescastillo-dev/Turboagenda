import type { NextRequest } from 'next/server'
import { InternalAppointmentSchema } from '@/lib/validators'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { sendAppointmentCreatedEmails } from '@/lib/appointment-emails'
import { formatTimeInTimeZone, normalizeTimeZone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Não autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Negócio não encontrado', 404)

    const parsed = InternalAppointmentSchema.safeParse(await request.json())
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados inválidos', 400)

    const db = createAdminClient()
    const serviceIds = Array.from(new Set(parsed.data.service_ids?.length ? parsed.data.service_ids : [parsed.data.service_id]))
    const [{ data: services, error: servicesError }, { data: employee, error: employeeError }, { data: settings, error: settingsError }] = await Promise.all([
      db
        .from('services')
        .select('id, duration_minutes')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .in('id', serviceIds),
      db
        .from('employees')
        .select('id')
        .eq('business_id', business.id)
        .eq('id', parsed.data.employee_id)
        .eq('is_active', true)
        .maybeSingle(),
      db
        .from('business_settings')
        .select('time_zone')
        .eq('business_id', business.id)
        .maybeSingle(),
    ])

    if (servicesError) return handleError(servicesError.message, 500)
    if (employeeError) return handleError(employeeError.message, 500)
    if (settingsError) return handleError(settingsError.message, 500)
    if (!employee) return handleError('Profissional inválido ou inativo', 422)
    if (!services || services.length !== serviceIds.length) return handleError('Um dos serviços é inválido ou está inativo', 422)

    const start = new Date(parsed.data.start_time)
    if (start.getTime() <= Date.now()) return handleError('Escolha um horário futuro', 422)
    const durationMinutes = services.reduce((total, service) => total + service.duration_minutes, 0)
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const timeZone = normalizeTimeZone(settings?.time_zone)
    const localDate = dateKey(start, timeZone)
    const localTime = formatTimeInTimeZone(start.toISOString(), timeZone)
    const { data: availableSlots, error: availabilityError } = await db.rpc('get_available_slots', {
      p_business_id: business.id,
      p_service_id: serviceIds[0],
      p_service_ids: serviceIds,
      p_employee_id: parsed.data.employee_id,
      p_date: localDate,
    })
    if (availabilityError) return handleError(availabilityError.message, 500)
    if (!(availableSlots ?? []).includes(localTime)) return handleError('Este horário já não está disponível.', 409)

    const { data: appointment, error: appointmentError } = await db
      .from('appointments')
      .insert({
        business_id: business.id,
        service_id: serviceIds[0],
        employee_id: parsed.data.employee_id,
        client_name: parsed.data.client_name,
        client_email: parsed.data.client_email || null,
        client_phone: parsed.data.client_phone || null,
        client_birthdate: parsed.data.client_birthdate || null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        notes: parsed.data.notes || null,
        deposit_required: false,
        payment_status: 'not_required',
      })
      .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
      .single()

    if (appointmentError) {
      if (appointmentError.code === '23P01') return handleError('Este horário já foi ocupado. Escolha outro.', 409)
      return handleError(appointmentError.message, 422)
    }

    const orderedServices = serviceIds.map((id) => services.find((service) => service.id === id)!)
    const { error: junctionError } = await db.from('appointment_services').insert(
      orderedServices.map((service, position) => ({
        appointment_id: appointment.id,
        service_id: service.id,
        position,
        duration_minutes: service.duration_minutes,
        price: 0,
      }))
    )

    if (junctionError) {
      await db.from('appointments').delete().eq('id', appointment.id)
      return handleError(junctionError.message, 422)
    }

    if (parsed.data.client_email) {
      const { error: clientError } = await db.from('clients').upsert(
        {
          business_id: business.id,
          name: parsed.data.client_name,
          email: parsed.data.client_email,
          phone: parsed.data.client_phone || null,
          birthdate: parsed.data.client_birthdate || null,
          last_appointment_at: start.toISOString(),
        },
        { onConflict: 'business_id,email' }
      )
      if (clientError) console.error('[internal appointment] client sync failed', clientError.message)
    }

    await sendAppointmentCreatedEmails(appointment.id).catch((error) => {
      console.error('[internal appointment] email failed', error instanceof Error ? error.message : error)
    })

    return formatResponse(appointment, 201)
  } catch (error) {
    return handleError(error)
  }
}

function dateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
