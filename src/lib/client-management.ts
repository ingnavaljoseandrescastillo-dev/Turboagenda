import type { Appointment, Client, NotificationEvent, Subscription, BusinessSettings } from '@/types'
import type { CurrentBusiness, SupabaseServerClient } from '@/lib/api-helpers'

export type AppointmentWithRelations = Appointment & {
  service?: { name: string; duration_minutes: number; price: number } | null
  employee?: { name: string } | null
}

export type ClientSummary = Client & {
  appointment_count: number
  latest_status: Appointment['status'] | 'none'
  last_appointment: AppointmentWithRelations | null
  next_appointment: AppointmentWithRelations | null
}

export type ClientDetail = ClientSummary & {
  appointments: AppointmentWithRelations[]
  reminders: NotificationEvent[]
}

export type CommunicationSettings = {
  plan: Subscription['plan'] | 'trial'
  email_available: boolean
  whatsapp_available: boolean
  whatsapp_enabled: boolean
}

export function getBusinessPublicUrl(business: Pick<CurrentBusiness, 'slug'>) {
  return `https://turboagenda.pt/b/${business.slug}`
}

export async function loadClientSummaries(
  supabase: SupabaseServerClient,
  businessId: string
): Promise<ClientSummary[]> {
  const [{ data: clients, error: clientsError }, { data: appointments, error: appointmentsError }] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, business_id, name, email, phone, birthdate, last_appointment_at, created_at')
        .eq('business_id', businessId)
        .order('last_appointment_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('appointments')
        .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
        .eq('business_id', businessId)
        .order('start_time', { ascending: false })
        .limit(1000),
    ])

  if (clientsError) throw new Error(clientsError.message)
  if (appointmentsError) throw new Error(appointmentsError.message)

  return buildClientSummaries(
    (clients ?? []) as Client[],
    (appointments ?? []) as AppointmentWithRelations[]
  )
}

export async function loadClientDetail(
  supabase: SupabaseServerClient,
  businessId: string,
  clientId: string
): Promise<ClientDetail | null> {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, business_id, name, email, phone, birthdate, last_appointment_at, created_at')
    .eq('business_id', businessId)
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) throw new Error(clientError.message)
  if (!client) return null

  const [{ data: appointments, error: appointmentsError }, { data: reminders, error: remindersError }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('*, service:services(name, duration_minutes, price), employee:employees(name)')
        .eq('business_id', businessId)
        .ilike('client_email', client.email)
        .order('start_time', { ascending: false })
        .limit(100),
      supabase
        .from('notification_events')
        .select('*')
        .eq('business_id', businessId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  if (appointmentsError) throw new Error(appointmentsError.message)
  if (remindersError) throw new Error(remindersError.message)

  const summaries = buildClientSummaries(
    [client as Client],
    (appointments ?? []) as AppointmentWithRelations[]
  )
  const summary = summaries[0]

  return {
    ...summary,
    appointments: (appointments ?? []) as AppointmentWithRelations[],
    reminders: (reminders ?? []) as NotificationEvent[],
  }
}

export async function loadCommunicationSettings(
  supabase: SupabaseServerClient,
  businessId: string
): Promise<CommunicationSettings> {
  const [{ data: subscription, error: subscriptionError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabase.from('subscriptions').select('plan').eq('business_id', businessId).maybeSingle(),
      supabase
        .from('business_settings')
        .select('whatsapp_enabled')
        .eq('business_id', businessId)
        .maybeSingle(),
    ])

  if (subscriptionError) throw new Error(subscriptionError.message)
  if (settingsError) throw new Error(settingsError.message)

  const plan = (subscription?.plan ?? 'trial') as CommunicationSettings['plan']
  const whatsappEnabled = Boolean((settings as Pick<BusinessSettings, 'whatsapp_enabled'> | null)?.whatsapp_enabled)

  return {
    plan,
    email_available: true,
    whatsapp_available: plan === 'plus' && whatsappEnabled,
    whatsapp_enabled: whatsappEnabled,
  }
}

function buildClientSummaries(
  clients: Client[],
  appointments: AppointmentWithRelations[]
): ClientSummary[] {
  const now = Date.now()
  const byEmail = new Map<string, AppointmentWithRelations[]>()

  for (const appointment of appointments) {
    if (!appointment.client_email) continue
    const key = appointment.client_email.toLowerCase()
    const list = byEmail.get(key) ?? []
    list.push(appointment)
    byEmail.set(key, list)
  }

  return clients.map((client) => {
    const clientAppointments = byEmail.get(client.email.toLowerCase()) ?? []
    const nonCancelled = clientAppointments.filter((appointment) => appointment.status !== 'cancelled')
    const nextAppointment =
      nonCancelled
        .filter((appointment) => new Date(appointment.start_time).getTime() >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] ?? null
    const lastAppointment = clientAppointments[0] ?? null

    return {
      ...client,
      appointment_count: clientAppointments.length,
      latest_status: lastAppointment?.status ?? 'none',
      last_appointment: lastAppointment,
      next_appointment: nextAppointment,
    }
  })
}
