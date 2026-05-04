import { createClient } from '@/lib/supabase/server'
import { getEmailFrom, getResend } from '@/lib/resend'
import { formatDateTime } from '@/lib/utils'

type AppointmentEmailData = {
  id: string
  client_name: string
  client_email: string
  client_phone: string | null
  start_time: string
  end_time: string
  businesses: {
    id: string
    name: string
    slug: string
    phone: string | null
    notification_email: string | null
  } | null
  services: {
    name: string
    duration_minutes: number
    price: number
  } | null
  employees: {
    name: string
  } | null
}

export async function sendAppointmentCreatedEmails(appointmentId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_appointment_email_payload', {
      p_appointment_id: appointmentId,
    })

    if (error) throw error
    if (!data) return

    const appointment = data as unknown as AppointmentEmailData
    const business = appointment.businesses
    if (!business) return

    const resend = getResend()
    const from = getEmailFrom()
    const appointmentUrl = `https://turboagenda.pt/b/${business.slug}`
    const when = formatDateTime(appointment.start_time)
    const serviceName = appointment.services?.name ?? 'Servico'
    const employeeName = appointment.employees?.name ?? 'Profissional'

    const sends = [
      resend.emails.send({
        from,
        to: appointment.client_email,
        subject: `Reserva recebida em ${business.name}`,
        html: appointmentClientHtml({
          businessName: business.name,
          clientName: appointment.client_name,
          serviceName,
          employeeName,
          when,
          appointmentUrl,
        }),
      }),
    ]

    if (business.notification_email) {
      sends.push(
        resend.emails.send({
          from,
          to: business.notification_email,
          subject: `Nova reserva: ${appointment.client_name}`,
          html: appointmentBusinessHtml({
            businessName: business.name,
            clientName: appointment.client_name,
            clientEmail: appointment.client_email,
            clientPhone: appointment.client_phone,
            serviceName,
            employeeName,
            when,
          }),
        })
      )
    }

    const results = await Promise.allSettled(sends)
    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[appointment email] send failed', result.reason)
      } else if (result.value.error) {
        console.error('[appointment email] resend error', result.value.error)
      }
    }
  } catch (err) {
    console.error('[appointment email] unexpected failure', err)
  }
}

function appointmentClientHtml({
  businessName,
  clientName,
  serviceName,
  employeeName,
  when,
  appointmentUrl,
}: {
  businessName: string
  clientName: string
  serviceName: string
  employeeName: string
  when: string
  appointmentUrl: string
}) {
  return emailShell(
    `Reserva recebida em ${escapeHtml(businessName)}`,
    `
      <p>Ola ${escapeHtml(clientName)},</p>
      <p>A sua reserva foi recebida por <strong>${escapeHtml(businessName)}</strong>.</p>
      <div class="box">
        <p><strong>Servico:</strong> ${escapeHtml(serviceName)}</p>
        <p><strong>Profissional:</strong> ${escapeHtml(employeeName)}</p>
        <p><strong>Data e hora:</strong> ${escapeHtml(when)}</p>
      </div>
      <p>Se precisar alterar ou cancelar, contacte diretamente o negocio.</p>
      <p><a href="${escapeAttribute(appointmentUrl)}">Ver pagina do negocio</a></p>
    `
  )
}

function appointmentBusinessHtml({
  businessName,
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  employeeName,
  when,
}: {
  businessName: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  serviceName: string
  employeeName: string
  when: string
}) {
  return emailShell(
    `Nova reserva em ${escapeHtml(businessName)}`,
    `
      <p>Nova reserva recebida.</p>
      <div class="box">
        <p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(clientEmail)}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(clientPhone || 'Nao informado')}</p>
        <p><strong>Servico:</strong> ${escapeHtml(serviceName)}</p>
        <p><strong>Profissional:</strong> ${escapeHtml(employeeName)}</p>
        <p><strong>Data e hora:</strong> ${escapeHtml(when)}</p>
      </div>
      <p>Entre no dashboard para acompanhar a agenda.</p>
    `
  )
}

function emailShell(title: string, body: string) {
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
          .box p { margin: 0 0 8px; }
          .box p:last-child { margin-bottom: 0; }
          .footer { margin-top: 18px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>${title}</h1>
            ${body}
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

function escapeAttribute(value: string) {
  return escapeHtml(value)
}
