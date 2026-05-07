import type { SupabaseClient } from '@supabase/supabase-js'
import { getEmailFrom, getResend } from '@/lib/resend'
import { getBusinessPublicUrl } from '@/lib/client-management'

type AdminClient = SupabaseClient

type RebookingSettings = {
  business_id: string
  email_rebooking_reminder_enabled: boolean | null
  email_rebooking_reminder_delay_days: number | null
  email_rebooking_reminder_message: string | null
  whatsapp_enabled: boolean | null
  whatsapp_rebooking_reminder_enabled: boolean | null
  whatsapp_rebooking_reminder_delay_days: number | null
  whatsapp_rebooking_reminder_message: string | null
}

type RebookingBusiness = {
  id: string
  name: string
  slug: string
  phone: string | null
}

type RebookingSubscription = {
  business_id: string
  plan: 'trial' | 'basic' | 'plus'
  status: string
}

type RebookingAppointment = {
  id: string
  business_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  start_time: string
  end_time: string
  status: string
}

type RebookingClient = {
  id: string
  business_id: string
  name: string
  email: string
  phone: string | null
}

type ExistingEvent = {
  appointment_id: string | null
  client_id: string | null
  channel: 'email' | 'whatsapp'
}

type RebookingJobResult = {
  scannedBusinesses: number
  sent: number
  queued: number
  skipped: number
  failed: number
}

const DEFAULT_EMAIL_MESSAGE =
  'Hola {{client_name}}, esperamos que hayas disfrutado tu visita en {{business_name}}. Cuando quieras volver, puedes reservar aqui: {{public_url}}'

const DEFAULT_WHATSAPP_MESSAGE =
  'Hola {{client_name}}, esperamos que hayas disfrutado tu visita en {{business_name}}. Puedes volver a reservar aqui: {{public_url}}'

export async function processRebookingReminders(admin: AdminClient): Promise<RebookingJobResult> {
  const result: RebookingJobResult = {
    scannedBusinesses: 0,
    sent: 0,
    queued: 0,
    skipped: 0,
    failed: 0,
  }

  const { data: settingsRows, error: settingsError } = await admin
    .from('business_settings')
    .select(
      'business_id, email_rebooking_reminder_enabled, email_rebooking_reminder_delay_days, email_rebooking_reminder_message, whatsapp_enabled, whatsapp_rebooking_reminder_enabled, whatsapp_rebooking_reminder_delay_days, whatsapp_rebooking_reminder_message'
    )
    .or('email_rebooking_reminder_enabled.eq.true,whatsapp_rebooking_reminder_enabled.eq.true')

  if (settingsError) throw new Error(settingsError.message)
  const settings = (settingsRows ?? []) as RebookingSettings[]
  result.scannedBusinesses = settings.length
  if (settings.length === 0) return result

  const businessIds = settings.map((row) => row.business_id)
  const [{ data: businesses, error: businessesError }, { data: subscriptions, error: subscriptionsError }] =
    await Promise.all([
      admin.from('businesses').select('id, name, slug, phone').in('id', businessIds),
      admin.from('subscriptions').select('business_id, plan, status').in('business_id', businessIds),
    ])

  if (businessesError) throw new Error(businessesError.message)
  if (subscriptionsError) throw new Error(subscriptionsError.message)

  const businessById = new Map((businesses ?? []).map((item) => [item.id, item as RebookingBusiness]))
  const subscriptionByBusinessId = new Map(
    (subscriptions ?? []).map((item) => [item.business_id, item as RebookingSubscription])
  )

  for (const row of settings) {
    const business = businessById.get(row.business_id)
    if (!business) {
      result.skipped += 1
      continue
    }

    const subscription = subscriptionByBusinessId.get(row.business_id)
    const channels = getChannels(row, subscription)
    if (channels.length === 0) {
      result.skipped += 1
      continue
    }

    const businessResult = await processBusinessRebooking({
      admin,
      business,
      settings: row,
      channels,
    })
    result.sent += businessResult.sent
    result.queued += businessResult.queued
    result.skipped += businessResult.skipped
    result.failed += businessResult.failed
  }

  return result
}

function getChannels(settings: RebookingSettings, subscription: RebookingSubscription | undefined) {
  const channels: Array<'email' | 'whatsapp'> = []
  if (settings.email_rebooking_reminder_enabled) channels.push('email')
  if (
    subscription?.plan === 'plus' &&
    settings.whatsapp_enabled &&
    settings.whatsapp_rebooking_reminder_enabled
  ) {
    channels.push('whatsapp')
  }
  return channels
}

async function processBusinessRebooking({
  admin,
  business,
  settings,
  channels,
}: {
  admin: AdminClient
  business: RebookingBusiness
  settings: RebookingSettings
  channels: Array<'email' | 'whatsapp'>
}) {
  const result = { sent: 0, queued: 0, skipped: 0, failed: 0 }
  const maxDelay = Math.max(
    settings.email_rebooking_reminder_delay_days ?? 21,
    settings.whatsapp_rebooking_reminder_delay_days ?? 21
  )
  const latestEligibleDate = new Date()
  latestEligibleDate.setDate(latestEligibleDate.getDate() - maxDelay)

  const [{ data: pastAppointments, error: appointmentsError }, { data: futureAppointments, error: futureError }] =
    await Promise.all([
      admin
        .from('appointments')
        .select('id, business_id, client_name, client_email, client_phone, start_time, end_time, status')
        .eq('business_id', business.id)
        .in('status', ['confirmed', 'completed'])
        .lte('end_time', latestEligibleDate.toISOString())
        .order('end_time', { ascending: false })
        .limit(300),
      admin
        .from('appointments')
        .select('client_email')
        .eq('business_id', business.id)
        .neq('status', 'cancelled')
        .gt('start_time', new Date().toISOString())
        .limit(1000),
    ])

  if (appointmentsError) throw new Error(appointmentsError.message)
  if (futureError) throw new Error(futureError.message)

  const latestByEmail = new Map<string, RebookingAppointment>()
  for (const appointment of (pastAppointments ?? []) as RebookingAppointment[]) {
    const key = appointment.client_email.toLowerCase()
    if (!latestByEmail.has(key)) latestByEmail.set(key, appointment)
  }

  const futureEmails = new Set(
    (futureAppointments ?? [])
      .map((appointment) => String(appointment.client_email ?? '').toLowerCase())
      .filter(Boolean)
  )
  const emails = [...latestByEmail.keys()].filter((email) => !futureEmails.has(email))
  if (emails.length === 0) return result

  const { data: clients, error: clientsError } = await admin
    .from('clients')
    .select('id, business_id, name, email, phone')
    .eq('business_id', business.id)
    .in('email', emails)

  if (clientsError) throw new Error(clientsError.message)

  const clientsByEmail = new Map(
    ((clients ?? []) as RebookingClient[]).map((client) => [client.email.toLowerCase(), client])
  )
  const appointmentIds = [...latestByEmail.values()].map((appointment) => appointment.id)
  const { data: existing, error: existingError } = await admin
    .from('notification_events')
    .select('appointment_id, client_id, channel')
    .eq('business_id', business.id)
    .eq('event_type', 'rebooking_reminder')
    .in('appointment_id', appointmentIds)

  if (existingError) throw new Error(existingError.message)

  const existingKeys = new Set(
    ((existing ?? []) as ExistingEvent[]).map((event) => `${event.appointment_id}:${event.client_id}:${event.channel}`)
  )

  for (const email of emails) {
    const appointment = latestByEmail.get(email)
    const client = clientsByEmail.get(email)
    if (!appointment || !client) {
      result.skipped += 1
      continue
    }

    for (const channel of channels) {
      const delay = channel === 'email'
        ? settings.email_rebooking_reminder_delay_days ?? 21
        : settings.whatsapp_rebooking_reminder_delay_days ?? 21
      const dueAt = new Date(appointment.end_time)
      dueAt.setDate(dueAt.getDate() + delay)
      if (dueAt > new Date()) {
        result.skipped += 1
        continue
      }

      const dedupeKey = `${appointment.id}:${client.id}:${channel}`
      if (existingKeys.has(dedupeKey)) {
        result.skipped += 1
        continue
      }

      const messageTemplate = channel === 'email'
        ? settings.email_rebooking_reminder_message || DEFAULT_EMAIL_MESSAGE
        : settings.whatsapp_rebooking_reminder_message || DEFAULT_WHATSAPP_MESSAGE
      const message = renderRebookingTemplate(messageTemplate, {
        clientName: client.name || appointment.client_name,
        businessName: business.name,
        publicUrl: getBusinessPublicUrl(business),
      })

      if (channel === 'email') {
        const sent = await sendRebookingEmail({
          business,
          client,
          appointment,
          message,
        })
        await insertRebookingEvent({
          admin,
          business,
          appointment,
          client,
          channel,
          message,
          status: sent.ok ? 'sent' : 'failed',
          error: sent.error,
        })
        if (sent.ok) result.sent += 1
        else result.failed += 1
      } else {
        await insertRebookingEvent({
          admin,
          business,
          appointment,
          client,
          channel,
          message,
          status: 'queued',
          error: null,
        })
        result.queued += 1
      }
    }
  }

  return result
}

async function sendRebookingEmail({
  business,
  client,
  appointment,
  message,
}: {
  business: RebookingBusiness
  client: RebookingClient
  appointment: RebookingAppointment
  message: string
}) {
  try {
    const result = await getResend().emails.send({
      from: getEmailFrom(),
      to: client.email,
      subject: `Volver a reservar - ${business.name}`,
      html: rebookingEmailHtml({
        title: `Volver a reservar en ${business.name}`,
        clientName: client.name || appointment.client_name,
        businessName: business.name,
        message,
        publicUrl: getBusinessPublicUrl(business),
      }),
    })

    if (result.error) return { ok: false, error: result.error.message }
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email send failed' }
  }
}

async function insertRebookingEvent({
  admin,
  business,
  appointment,
  client,
  channel,
  message,
  status,
  error,
}: {
  admin: AdminClient
  business: RebookingBusiness
  appointment: RebookingAppointment
  client: RebookingClient
  channel: 'email' | 'whatsapp'
  message: string
  status: 'queued' | 'sent' | 'failed'
  error: string | null
}) {
  const { error: insertError } = await admin.from('notification_events').insert({
    business_id: business.id,
    appointment_id: appointment.id,
    client_id: client.id,
    channel,
    event_type: 'rebooking_reminder',
    recipient_type: 'client',
    recipient_name: client.name || appointment.client_name,
    recipient_phone: client.phone || appointment.client_phone,
    recipient_email: client.email,
    status,
    scheduled_for: new Date().toISOString(),
    payload: {
      message,
      public_url: getBusinessPublicUrl(business),
      last_appointment_end: appointment.end_time,
    },
    error,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })

  if (insertError) throw new Error(insertError.message)
}

export function renderRebookingTemplate(
  template: string,
  values: { clientName: string; businessName: string; publicUrl: string }
) {
  return template
    .replaceAll('{{client_name}}', values.clientName)
    .replaceAll('{{business_name}}', values.businessName)
    .replaceAll('{{public_url}}', values.publicUrl)
}

function rebookingEmailHtml({
  title,
  clientName,
  businessName,
  message,
  publicUrl,
}: {
  title: string
  clientName: string
  businessName: string
  message: string
  publicUrl: string
}) {
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
          .button { display: inline-block; background: #10b981; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; }
          .footer { margin-top: 18px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>${escapeHtml(title)}</h1>
            <p>Hola ${escapeHtml(clientName)},</p>
            <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
            <p><a class="button" href="${escapeHtml(publicUrl)}">Reservar otra vez</a></p>
            <p>Gracias por confiar en ${escapeHtml(businessName)}.</p>
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
