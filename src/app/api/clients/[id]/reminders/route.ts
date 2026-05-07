import type { NextRequest } from 'next/server'
import { ManualReminderSchema } from '@/lib/validators'
import { formatResponse, getBusinessForUser, handleError, validateAuth } from '@/lib/api-helpers'
import { getBusinessPublicUrl, loadCommunicationSettings } from '@/lib/client-management'
import { getEmailFrom, getResend } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'

type Ctx = { params: Promise<{ id: string }> }
type ReminderChannel = 'email' | 'whatsapp'

type AppointmentReminderRow = {
  id: string
  business_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  start_time: string
  end_time: string
  status: string
  service: { name: string } | null
  employee: { name: string } | null
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { user, supabase, unauthorized } = await validateAuth()
    if (unauthorized || !user) return handleError('Nao autenticado', 401)

    const business = await getBusinessForUser(supabase, user.id)
    if (!business) return handleError('Nenhum negocio encontrado. Crie o negocio inicial no onboarding.', 404)

    const body = await request.json()
    const parsed = ManualReminderSchema.safeParse(body)
    if (!parsed.success) return handleError(parsed.error.issues[0]?.message ?? 'Dados invalidos', 400)

    const { id: clientId } = await params
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, business_id, name, email, phone')
      .eq('business_id', business.id)
      .eq('id', clientId)
      .maybeSingle()

    if (clientError) return handleError(clientError.message, 422)
    if (!client) return handleError('Cliente nao encontrado', 404)

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, business_id, client_name, client_email, client_phone, start_time, end_time, status, service:services(name), employee:employees(name)')
      .eq('business_id', business.id)
      .eq('id', parsed.data.appointment_id)
      .maybeSingle()

    if (appointmentError) return handleError(appointmentError.message, 422)
    if (!appointment) return handleError('Cita nao encontrada', 404)

    const reminderAppointment = appointment as unknown as AppointmentReminderRow
    if (reminderAppointment.client_email.toLowerCase() !== client.email.toLowerCase()) {
      return handleError('Esta cita nao pertence ao cliente selecionado', 403)
    }

    const channels = Array.from(new Set(parsed.data.channels)) as ReminderChannel[]
    const communication = await loadCommunicationSettings(supabase, business.id)
    const hasEmail = Boolean(client.email)
    const hasWhatsapp = Boolean(client.phone || reminderAppointment.client_phone)

    if (channels.includes('email') && !hasEmail) return handleError('Este cliente nao tem email', 422)
    if (channels.includes('whatsapp') && !communication.whatsapp_available) {
      return handleError('WhatsApp esta disponible solo si el negocio esta en Plan Plus y activo en configuracion', 403)
    }
    if (channels.includes('whatsapp') && !hasWhatsapp) return handleError('Este cliente nao tem telefone', 422)

    const publicUrl = getBusinessPublicUrl(business)
    const results = []

    for (const channel of channels) {
      if (channel === 'email') {
        results.push(
          await sendEmailAndLog({
            supabase,
            businessId: business.id,
            appointment: reminderAppointment,
            clientId: client.id,
            recipientName: client.name,
            recipientEmail: client.email,
            recipientPhone: client.phone ?? reminderAppointment.client_phone,
            businessName: business.name,
            publicUrl,
            subject: parsed.data.subject ?? `Recordatorio de cita - ${business.name}`,
            message: parsed.data.message,
          })
        )
      }

      if (channel === 'whatsapp') {
        results.push(
          await queueWhatsappReminder({
            supabase,
            businessId: business.id,
            appointment: reminderAppointment,
            clientId: client.id,
            recipientName: client.name,
            recipientPhone: client.phone ?? reminderAppointment.client_phone,
            recipientEmail: client.email,
            publicUrl,
            message: parsed.data.message,
          })
        )
      }
    }

    const failed = results.filter((result) => result.status === 'failed')
    return formatResponse(
      {
        results,
        message: failed.length
          ? 'Alguns recordatorios nao foram enviados. Veja o historico.'
          : 'Recordatorio enviado/registrado com sucesso.',
      },
      failed.length === results.length ? 422 : 201
    )
  } catch (err) {
    return handleError(err)
  }
}

async function sendEmailAndLog({
  supabase,
  businessId,
  appointment,
  clientId,
  recipientName,
  recipientEmail,
  recipientPhone,
  businessName,
  publicUrl,
  subject,
  message,
}: {
  supabase: Awaited<ReturnType<typeof validateAuth>>['supabase']
  businessId: string
  appointment: AppointmentReminderRow
  clientId: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string | null
  businessName: string
  publicUrl: string
  subject: string
  message: string
}) {
  let status: 'sent' | 'failed' = 'sent'
  let error: string | null = null

  try {
    const resend = getResend()
    const result = await resend.emails.send({
      from: getEmailFrom(),
      to: recipientEmail,
      subject,
      html: manualReminderHtml({
        title: subject,
        businessName,
        recipientName,
        message,
        publicUrl,
        when: formatDateTime(appointment.start_time),
        serviceName: appointment.service?.name ?? 'Servicio',
        employeeName: appointment.employee?.name ?? 'Profesional',
      }),
    })

    if (result.error) {
      status = 'failed'
      error = result.error.message
    }
  } catch (err) {
    status = 'failed'
    error = err instanceof Error ? err.message : 'Email send failed'
  }

  return insertReminderEvent({
    supabase,
    businessId,
    appointmentId: appointment.id,
    clientId,
    channel: 'email',
    recipientName,
    recipientEmail,
    recipientPhone,
    status,
    payload: { message, subject, public_url: publicUrl, appointment_start: appointment.start_time },
    error,
  })
}

async function queueWhatsappReminder({
  supabase,
  businessId,
  appointment,
  clientId,
  recipientName,
  recipientEmail,
  recipientPhone,
  publicUrl,
  message,
}: {
  supabase: Awaited<ReturnType<typeof validateAuth>>['supabase']
  businessId: string
  appointment: AppointmentReminderRow
  clientId: string
  recipientName: string
  recipientEmail: string
  recipientPhone: string | null
  publicUrl: string
  message: string
}) {
  return insertReminderEvent({
    supabase,
    businessId,
    appointmentId: appointment.id,
    clientId,
    channel: 'whatsapp',
    recipientName,
    recipientEmail,
    recipientPhone,
    status: 'queued',
    payload: { message, public_url: publicUrl, appointment_start: appointment.start_time },
    error: null,
  })
}

async function insertReminderEvent({
  supabase,
  businessId,
  appointmentId,
  clientId,
  channel,
  recipientName,
  recipientEmail,
  recipientPhone,
  status,
  payload,
  error,
}: {
  supabase: Awaited<ReturnType<typeof validateAuth>>['supabase']
  businessId: string
  appointmentId: string
  clientId: string
  channel: ReminderChannel
  recipientName: string
  recipientEmail: string | null
  recipientPhone: string | null
  status: 'queued' | 'sent' | 'failed'
  payload: Record<string, unknown>
  error: string | null
}) {
  const { data, error: insertError } = await supabase
    .from('notification_events')
    .insert({
      business_id: businessId,
      appointment_id: appointmentId,
      client_id: clientId,
      channel,
      event_type: 'manual_reminder',
      recipient_type: 'client',
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_email: recipientEmail,
      status,
      scheduled_for: new Date().toISOString(),
      payload,
      error,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (insertError) throw new Error(insertError.message)
  return data
}

function manualReminderHtml({
  title,
  businessName,
  recipientName,
  message,
  publicUrl,
  when,
  serviceName,
  employeeName,
}: {
  title: string
  businessName: string
  recipientName: string
  message: string
  publicUrl: string
  when: string
  serviceName: string
  employeeName: string
}) {
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />')
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { margin: 0; background: #f4f4f5; color: #18181b; font-family: Arial, sans-serif; }
          .wrap { max-width: 560px; margin: 0 auto; padding: 32px 18px; }
          .card { background: #ffffff; border-radius: 14px; padding: 26px; border: 1px solid #e4e4e7; }
          h1 { margin: 0 0 18px; font-size: 22px; color: #09090b; }
          p { margin: 0 0 14px; line-height: 1.55; }
          a { color: #047857; font-weight: 700; }
          .box { background: #f8fafc; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 18px 0; }
          .footer { margin-top: 18px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>${escapeHtml(title)}</h1>
            <p>Hola ${escapeHtml(recipientName)},</p>
            <p>${escapedMessage}</p>
            <div class="box">
              <p><strong>Negocio:</strong> ${escapeHtml(businessName)}</p>
              <p><strong>Servicio:</strong> ${escapeHtml(serviceName)}</p>
              <p><strong>Profesional:</strong> ${escapeHtml(employeeName)}</p>
              <p><strong>Fecha y hora:</strong> ${escapeHtml(when)}</p>
            </div>
            <p><a href="${escapeHtml(publicUrl)}">Ver pagina del negocio</a></p>
          </div>
          <div class="footer">Enviado por TurboAgenda</div>
        </div>
      </body>
    </html>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
