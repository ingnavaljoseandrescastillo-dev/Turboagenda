import type { SupabaseClient } from '@supabase/supabase-js'
import { getEmailFrom, getResend } from '@/lib/resend'
import { getBusinessPublicUrl } from '@/lib/client-management'
import { normalizeSmsPhone, sendSms } from '@/lib/twilio'
import { formatDateTime, normalizeTimeZone } from '@/lib/utils'

type AdminClient = SupabaseClient

type AppointmentReminderOptions = {
  dryRun?: boolean
  now?: Date
  targetHours?: number
  windowMinutes?: number
}

type AppointmentReminderResult = {
  scanned: number
  due: number
  sent: number
  skipped: number
  failed: number
  dryRun: boolean
}

type ReminderAppointment = {
  id: string
  business_id: string
  service_id: string
  employee_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  start_time: string
  end_time: string
  status: string
}

type ReminderBusiness = {
  id: string
  name: string
  slug: string
  phone: string | null
}

type ReminderSettings = {
  business_id: string
  email_reminder_24h_enabled: boolean | null
  sms_reminder_24h_enabled: boolean | null
  time_zone: string | null
}

type ReminderService = {
  id: string
  name: string
}

type ReminderEmployee = {
  id: string
  name: string
}

type ReminderClient = {
  id: string
  business_id: string
  email: string
}

type ReminderSubscription = {
  business_id: string
  plan: 'trial' | 'basic' | 'plus'
  status: string
}

type ExistingEvent = {
  appointment_id: string | null
  channel: 'email' | 'sms'
}

type SmsUsageEvent = {
  business_id: string
}

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const REMINDER_EVENT = 'appointment_reminder_24h'
const SMS_MONTHLY_LIMIT = 150

function getReminderWindow(now: Date, options: AppointmentReminderOptions) {
  if (typeof options.targetHours === 'number' && typeof options.windowMinutes === 'number') {
    const target = now.getTime() + options.targetHours * HOUR_MS
    const halfWindow = (options.windowMinutes * MINUTE_MS) / 2
    return {
      windowStart: new Date(target - halfWindow),
      windowEnd: new Date(target + halfWindow),
    }
  }

  return {
    windowStart: new Date(now.getTime() + 20 * HOUR_MS),
    windowEnd: new Date(now.getTime() + 44 * HOUR_MS),
  }
}

export async function processAppointmentReminderEmails(
  admin: AdminClient,
  options: AppointmentReminderOptions = {}
): Promise<AppointmentReminderResult> {
  const dryRun = Boolean(options.dryRun)
  const now = options.now ?? new Date()
  const { windowStart, windowEnd } = getReminderWindow(now, options)

  const result: AppointmentReminderResult = {
    scanned: 0,
    due: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    dryRun,
  }

  const { data: appointmentRows, error: appointmentsError } = await admin
    .from('appointments')
    .select('id, business_id, service_id, employee_id, client_name, client_email, client_phone, start_time, end_time, status')
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', windowStart.toISOString())
    .lt('start_time', windowEnd.toISOString())
    .order('start_time', { ascending: true })
    .limit(500)

  if (appointmentsError) throw new Error(appointmentsError.message)

  const appointments = (appointmentRows ?? []) as ReminderAppointment[]
  result.scanned = appointments.length
  if (appointments.length === 0) return result

  const appointmentIds = appointments.map((appointment) => appointment.id)
  const businessIds = unique(appointments.map((appointment) => appointment.business_id))
  const serviceIds = unique(appointments.map((appointment) => appointment.service_id))
  const employeeIds = unique(appointments.map((appointment) => appointment.employee_id))

  const [
    { data: businessRows, error: businessesError },
    { data: settingsRows, error: settingsError },
    { data: serviceRows, error: servicesError },
    { data: employeeRows, error: employeesError },
    { data: eventRows, error: eventsError },
    { data: clientRows, error: clientsError },
    { data: smsUsageRows, error: smsUsageError },
    { data: subscriptionRows, error: subscriptionsError },
  ] = await Promise.all([
    admin.from('businesses').select('id, name, slug, phone').in('id', businessIds),
    admin.from('business_settings').select('business_id, email_reminder_24h_enabled, sms_reminder_24h_enabled, time_zone').in('business_id', businessIds),
    admin.from('services').select('id, name').in('id', serviceIds),
    admin.from('employees').select('id, name').in('id', employeeIds),
    admin
      .from('notification_events')
      .select('appointment_id, channel')
      .in('channel', ['email', 'sms'])
      .eq('event_type', REMINDER_EVENT)
      .in('status', ['queued', 'sent'])
      .in('appointment_id', appointmentIds),
    admin
      .from('clients')
      .select('id, business_id, email')
      .in('business_id', businessIds),
    admin
      .from('notification_events')
      .select('business_id')
      .in('business_id', businessIds)
      .eq('channel', 'sms')
      .eq('event_type', REMINDER_EVENT)
      .in('status', ['queued', 'sent'])
      .gte('created_at', getMonthStart(now).toISOString())
      .limit(10000),
    admin
      .from('subscriptions')
      .select('business_id, plan, status')
      .in('business_id', businessIds),
  ])

  if (businessesError) throw new Error(businessesError.message)
  if (settingsError) throw new Error(settingsError.message)
  if (servicesError) throw new Error(servicesError.message)
  if (employeesError) throw new Error(employeesError.message)
  if (eventsError) throw new Error(eventsError.message)
  if (clientsError) throw new Error(clientsError.message)
  if (smsUsageError) throw new Error(smsUsageError.message)
  if (subscriptionsError) throw new Error(subscriptionsError.message)

  const businesses = mapById((businessRows ?? []) as ReminderBusiness[])
  const settings = new Map(
    ((settingsRows ?? []) as ReminderSettings[]).map((row) => [row.business_id, row])
  )
  const services = mapById((serviceRows ?? []) as ReminderService[])
  const employees = mapById((employeeRows ?? []) as ReminderEmployee[])
  const alreadyHandled = new Set(
    ((eventRows ?? []) as ExistingEvent[])
      .filter((event) => event.appointment_id)
      .map((event) => `${event.appointment_id}:${event.channel}`)
  )
  const clientsByBusinessEmail = new Map(
    ((clientRows ?? []) as ReminderClient[]).map((client) => [
      clientKey(client.business_id, client.email),
      client,
    ])
  )
  const smsUsage = countByBusiness((smsUsageRows ?? []) as SmsUsageEvent[])
  const subscriptions = new Map(
    ((subscriptionRows ?? []) as ReminderSubscription[]).map((row) => [row.business_id, row])
  )

  for (const appointment of appointments) {
    const business = businesses.get(appointment.business_id)
    const businessSettings = settings.get(appointment.business_id)
    const subscription = subscriptions.get(appointment.business_id)
    const smsAvailable = subscription?.plan === 'basic' || subscription?.plan === 'plus'

    if (!business) {
      result.skipped += 1
      continue
    }

    const timeZone = normalizeTimeZone(businessSettings?.time_zone)
    const serviceName = services.get(appointment.service_id)?.name ?? 'Servico'
    const employeeName = employees.get(appointment.employee_id)?.name ?? 'Profissional'
    const publicUrl = getBusinessPublicUrl(business)
    const when = formatDateTime(appointment.start_time, timeZone)
    const client = appointment.client_email
      ? clientsByBusinessEmail.get(clientKey(appointment.business_id, appointment.client_email))
      : undefined
    const message = `Ola ${appointment.client_name}, este e um lembrete da sua reserva em ${business.name} para ${when}.`
    let handledAppointment = false

    if (
      appointment.client_email &&
      businessSettings?.email_reminder_24h_enabled !== false &&
      !alreadyHandled.has(`${appointment.id}:email`)
    ) {
      result.due += 1
      handledAppointment = true

      if (!dryRun) {
        const sent = await sendReminderEmail({
          appointment,
          business,
          serviceName,
          employeeName,
          publicUrl,
          when,
          message,
        })

        await insertReminderEvent({
          admin,
          appointment,
          business,
          clientId: client?.id ?? null,
          channel: 'email',
          recipientPhone: appointment.client_phone,
          serviceName,
          employeeName,
          publicUrl,
          timeZone,
          message,
          status: sent.ok ? 'sent' : 'failed',
          error: sent.error,
        })

        if (sent.ok) result.sent += 1
        else result.failed += 1
      }
    }

    const smsPhone = normalizeSmsPhone(appointment.client_phone)
    if (
      businessSettings?.sms_reminder_24h_enabled &&
      smsAvailable &&
      smsPhone &&
      (smsUsage.get(appointment.business_id) ?? 0) < SMS_MONTHLY_LIMIT &&
      !alreadyHandled.has(`${appointment.id}:sms`)
    ) {
      result.due += 1
      handledAppointment = true
      const smsMessage = buildReminderSms({
        clientName: appointment.client_name,
        businessName: business.name,
        when,
        businessPhone: business.phone,
      })

      if (!dryRun) {
        const sent = await sendReminderSms(smsPhone, smsMessage)

        await insertReminderEvent({
          admin,
          appointment,
          business,
          clientId: client?.id ?? null,
          channel: 'sms',
          recipientPhone: smsPhone,
          serviceName,
          employeeName,
          publicUrl,
          timeZone,
          message: smsMessage,
          status: sent.ok ? 'sent' : 'failed',
          error: sent.error,
        })

        if (sent.ok) result.sent += 1
        else result.failed += 1
        if (sent.ok) smsUsage.set(appointment.business_id, (smsUsage.get(appointment.business_id) ?? 0) + 1)
      }
    }

    if (!handledAppointment) result.skipped += 1
  }

  return result
}

async function sendReminderSms(to: string, message: string) {
  try {
    await sendSms({ to, body: message })
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'SMS send failed' }
  }
}

async function sendReminderEmail({
  appointment,
  business,
  serviceName,
  employeeName,
  publicUrl,
  when,
  message,
}: {
  appointment: ReminderAppointment
  business: ReminderBusiness
  serviceName: string
  employeeName: string
  publicUrl: string
  when: string
  message: string
}) {
  try {
    const result = await getResend().emails.send({
      from: getEmailFrom(),
      to: appointment.client_email,
      subject: `Recordatorio de cita - ${business.name}`,
      html: reminderEmailHtml({
        businessName: business.name,
        businessPhone: business.phone,
        clientName: appointment.client_name,
        serviceName,
        employeeName,
        publicUrl,
        when,
        message,
      }),
    })

    if (result.error) return { ok: false, error: result.error.message }
    return { ok: true, error: null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email send failed' }
  }
}

async function insertReminderEvent({
  admin,
  appointment,
  business,
  clientId,
  channel,
  recipientPhone,
  serviceName,
  employeeName,
  publicUrl,
  timeZone,
  message,
  status,
  error,
}: {
  admin: AdminClient
  appointment: ReminderAppointment
  business: ReminderBusiness
  clientId: string | null
  channel: 'email' | 'sms'
  recipientPhone: string | null
  serviceName: string
  employeeName: string
  publicUrl: string
  timeZone: string
  message: string
  status: 'sent' | 'failed'
  error: string | null
}) {
  const scheduledFor = new Date(new Date(appointment.start_time).getTime() - 24 * HOUR_MS).toISOString()
  const { error: insertError } = await admin.from('notification_events').insert({
    business_id: business.id,
    appointment_id: appointment.id,
    client_id: clientId,
    channel,
    event_type: REMINDER_EVENT,
    recipient_type: 'client',
    recipient_name: appointment.client_name,
    recipient_phone: recipientPhone,
    recipient_email: appointment.client_email,
    status,
    scheduled_for: scheduledFor,
    payload: {
      message,
      public_url: publicUrl,
      business_name: business.name,
      business_phone: business.phone,
      service_name: serviceName,
      employee_name: employeeName,
      appointment_start: appointment.start_time,
      appointment_end: appointment.end_time,
      time_zone: timeZone,
    },
    error,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })

  if (insertError) throw new Error(insertError.message)
}

function buildReminderSms({
  clientName,
  businessName,
  when,
  businessPhone,
}: {
  clientName: string
  businessName: string
  when: string
  businessPhone: string | null
}) {
  const contact = businessPhone ? ` Se nao puder comparecer, contacte ${businessPhone}.` : ''
  return `Ola ${clientName}, lembrete da sua reserva em ${businessName}: ${when}.${contact}`
}

function reminderEmailHtml({
  businessName,
  businessPhone,
  clientName,
  serviceName,
  employeeName,
  publicUrl,
  when,
  message,
}: {
  businessName: string
  businessPhone: string | null
  clientName: string
  serviceName: string
  employeeName: string
  publicUrl: string
  when: string
  message: string
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
          .box { background: #f8fafc; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 18px 0; }
          .box p { margin: 0 0 8px; }
          .box p:last-child { margin-bottom: 0; }
          .button { display: inline-block; background: #10b981; color: #ffffff; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: 700; }
          .footer { margin-top: 18px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="card">
            <h1>Recordatorio de cita en ${escapeHtml(businessName)}</h1>
            <p>Ola ${escapeHtml(clientName)},</p>
            <p>${escapeHtml(message)}</p>
            <div class="box">
              <p><strong>Negocio:</strong> ${escapeHtml(businessName)}</p>
              <p><strong>Servico:</strong> ${escapeHtml(serviceName)}</p>
              <p><strong>Profissional:</strong> ${escapeHtml(employeeName)}</p>
              <p><strong>Data e hora:</strong> ${escapeHtml(when)}</p>
            </div>
            <p>Se nao puder comparecer, contacte o negocio${businessPhone ? ` pelo telefone ${escapeHtml(businessPhone)}` : ''}.</p>
            <p><a class="button" href="${escapeHtml(publicUrl)}">Ver pagina do negocio</a></p>
          </div>
          <div class="footer">Enviado por TurboAgenda</div>
        </div>
      </body>
    </html>
  `
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

function countByBusiness(items: SmsUsageEvent[]) {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.business_id, (counts.get(item.business_id) ?? 0) + 1)
  }
  return counts
}

function getMonthStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function clientKey(businessId: string, email: string) {
  return `${businessId}:${email.toLowerCase()}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
