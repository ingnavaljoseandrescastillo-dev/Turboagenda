import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/admin'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { AdminBusinessActions } from '../../AdminBusinessActions'
import { AdminNoteComposer } from '../../AdminNoteComposer'
import { AdminPaymentActions } from './AdminPaymentActions'

type BusinessDetail = {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  address: string | null
  owner_id: string
  created_at: string
  is_paused?: boolean
  pause_reason?: string | null
  business_settings:
    | {
        opening_time: string
        closing_time: string
        slot_duration_minutes: number
        working_days: number[]
        max_booking_days?: number
      }
    | null
  subscriptions:
    | {
        plan: 'trial' | 'basic' | 'plus'
        status: 'trial' | 'active' | 'cancelled' | 'past_due'
        trial_ends_at: string | null
        current_period_start?: string | null
        current_period_end: string | null
        last_payment_at?: string | null
        price_cents?: number
        currency?: string
        manual_override?: boolean
        notes?: string | null
      }
    | null
  services: {
    id: string
    name: string
    duration_minutes: number
    price: number
    is_active: boolean
  }[]
  employees: {
    id: string
    name: string
    role: string
    is_active: boolean
  }[]
  appointments: {
    id: string
    client_name: string
    client_email: string
    client_phone: string | null
    start_time: string
    end_time: string
    status: string
    services: { name: string } | null
    employees: { name: string } | null
  }[]
}

type AdminNote = {
  id: string
  admin_email: string | null
  note: string
  created_at: string
}

type AdminAuditLog = {
  id: string
  admin_email: string | null
  action: string
  created_at: string
  after_state: Record<string, unknown> | null
}

type AdminPayment = {
  id: string
  admin_email: string | null
  plan: 'basic' | 'plus'
  amount_cents: number
  currency: string
  paid_at: string
  period_start: string
  period_end: string
  method: string
  reference: string | null
  notes: string | null
  status: 'paid' | 'voided'
  voided_at: string | null
  voided_reason: string | null
}

function normalizeRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value))
}

function daysUntil(value?: string | null) {
  if (!value) return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function dueLabel(value?: string | null) {
  const days = daysUntil(value)
  if (days === null) return 'Sin fecha'
  if (days < 0) return `Vencido hace ${Math.abs(days)} dias`
  if (days === 0) return 'Vence hoy'
  return `Faltan ${days} dias`
}

function weekDays(days?: number[]) {
  if (!days?.length) return '-'
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
  return days.map((day) => labels[day] ?? day).join(', ')
}

export default async function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requirePlatformAdmin()

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `
        id,
        name,
        slug,
        description,
        phone,
        address,
        owner_id,
        created_at,
        is_paused,
        pause_reason,
        business_settings(opening_time,closing_time,slot_duration_minutes,working_days,max_booking_days),
        subscriptions(plan,status,trial_ends_at,current_period_start,current_period_end,last_payment_at,price_cents,currency,manual_override,notes),
        services(id,name,duration_minutes,price,is_active),
        employees(id,name,role,is_active),
        appointments(id,client_name,client_email,client_phone,start_time,end_time,status,services(name),employees(name))
      `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </main>
    )
  }

  if (!data) notFound()

  const business = {
    ...(data as unknown as BusinessDetail),
    business_settings: normalizeRelation((data as unknown as BusinessDetail).business_settings),
    subscriptions: normalizeRelation((data as unknown as BusinessDetail).subscriptions),
  }

  const { data: notesData } = await supabase
    .from('admin_notes')
    .select('id,admin_email,note,created_at')
    .eq('business_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: auditData } = await supabase
    .from('admin_audit_log')
    .select('id,admin_email,action,created_at,after_state')
    .eq('business_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: paymentsData } = await supabase
    .from('admin_subscription_payments')
    .select('id,admin_email,plan,amount_cents,currency,paid_at,period_start,period_end,method,reference,notes,status,voided_at,voided_reason')
    .eq('business_id', id)
    .order('paid_at', { ascending: false })
    .limit(50)

  const subscription = business.subscriptions
  const settings = business.business_settings
  const publicUrl = `https://turboagenda.pt/b/${business.slug}`
  const appointments = [...business.appointments].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-3 border-b border-zinc-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">
              Volver al panel
            </Link>
            <h1 className="mt-2 text-3xl font-black text-white">{business.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">/{business.slug}</p>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-500"
          >
            Ver pagina publica
          </a>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-bold text-white">Resumen operativo</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Telefono" value={business.phone ?? 'Sin telefono'} />
              <Info label="Direccion" value={business.address ?? 'Sin direccion'} />
              <Info label="Alta" value={formatDate(business.created_at)} />
              <Info label="Owner ID" value={business.owner_id} mono />
              <Info label="Horario" value={settings ? `${settings.opening_time} - ${settings.closing_time}` : '-'} />
              <Info label="Dias" value={weekDays(settings?.working_days)} />
              <Info label="Ventana reservas" value={`${settings?.max_booking_days ?? 30} dias`} />
              <Info label="Slot" value={`${settings?.slot_duration_minutes ?? 30} minutos`} />
            </div>
            {business.description && <p className="mt-4 text-sm text-zinc-400">{business.description}</p>}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="font-bold text-white">Plan y acceso</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-400">
              <p>
                Plan: <span className="font-semibold text-emerald-300">{subscription?.plan ?? 'trial'}</span>
              </p>
              <p>Estado: {subscription?.status ?? 'trial'}</p>
              <p>Trial: {formatDate(subscription?.trial_ends_at)}</p>
              <p>Periodo actual: {formatDate(subscription?.current_period_start)} - {formatDate(subscription?.current_period_end)}</p>
              <p>Vencimiento: {dueLabel(subscription?.status === 'trial' ? subscription?.trial_ends_at : subscription?.current_period_end)}</p>
              <p>Ultimo pago: {formatDate(subscription?.last_payment_at)}</p>
              <p>MRR: {formatCurrency((subscription?.price_cents ?? 0) / 100, subscription?.currency ?? 'EUR')}</p>
              <p>{business.is_paused ? `Pausado: ${business.pause_reason ?? 'sin motivo'}` : 'Operativo'}</p>
            </div>
            <div className="mt-4">
              <AdminBusinessActions
                businessId={business.id}
                isPaused={Boolean(business.is_paused)}
                plan={subscription?.plan ?? 'trial'}
                status={subscription?.status ?? 'trial'}
                priceCents={subscription?.price_cents ?? 0}
                trialEndsAt={subscription?.trial_ends_at}
              />
            </div>
          </div>
        </section>

        <Panel title="Pagos manuales">
          <div className="space-y-2">
            {((paymentsData ?? []) as AdminPayment[]).map((payment) => (
              <div
                key={payment.id}
                className={`rounded-lg border p-3 text-sm ${
                  payment.status === 'voided'
                    ? 'border-red-500/20 bg-red-500/5 opacity-80'
                    : 'border-zinc-800 bg-zinc-950'
                }`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className={payment.status === 'voided' ? 'font-semibold text-red-200 line-through' : 'font-semibold text-emerald-300'}>
                    {formatCurrency(payment.amount_cents / 100, payment.currency)} - {payment.plan}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatDateTime(payment.paid_at)}
                    {payment.status === 'voided' ? ' - Anulado' : ''}
                  </span>
                </div>
                <p className="mt-1 text-zinc-500">
                  Cubre {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Metodo: {payment.method}
                  {payment.reference ? ` - Ref: ${payment.reference}` : ''} - {payment.admin_email ?? 'Admin'}
                </p>
                {payment.notes && <p className="mt-2 text-xs text-zinc-500">{payment.notes}</p>}
                {payment.status === 'voided' && (
                  <p className="mt-2 text-xs text-red-200">
                    Anulado {payment.voided_at ? formatDateTime(payment.voided_at) : ''}: {payment.voided_reason ?? 'Sin motivo'}
                  </p>
                )}
                <AdminPaymentActions
                  businessId={business.id}
                  paymentId={payment.id}
                  status={payment.status ?? 'paid'}
                  method={payment.method}
                  reference={payment.reference}
                  notes={payment.notes}
                />
              </div>
            ))}
            {(paymentsData ?? []).length === 0 && <Empty text="Sin pagos registrados." />}
          </div>
        </Panel>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Servicios" value={business.services.length} />
          <Metric label="Empleados" value={business.employees.length} />
          <Metric label="Citas" value={business.appointments.length} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="Servicios">
            <div className="space-y-2">
              {business.services.map((service) => (
                <div key={service.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-zinc-100">{service.name}</span>
                    <span className={service.is_active ? 'text-emerald-300' : 'text-zinc-500'}>
                      {service.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    {service.duration_minutes} min - {formatCurrency(Number(service.price))}
                  </p>
                </div>
              ))}
              {business.services.length === 0 && <Empty text="No tiene servicios." />}
            </div>
          </Panel>

          <Panel title="Equipo">
            <div className="space-y-2">
              {business.employees.map((employee) => (
                <div key={employee.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-zinc-100">{employee.name}</span>
                    <span className={employee.is_active ? 'text-emerald-300' : 'text-zinc-500'}>
                      {employee.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">{employee.role}</p>
                </div>
              ))}
              {business.employees.length === 0 && <Empty text="No tiene empleados." />}
            </div>
          </Panel>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <Panel title="Ultimas citas">
            <div className="space-y-2">
              {appointments.slice(0, 10).map((appointment) => (
                <div key={appointment.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold text-zinc-100">{appointment.client_name}</span>
                    <span className="text-xs text-zinc-500">{formatDateTime(appointment.start_time)}</span>
                  </div>
                  <p className="mt-1 text-zinc-500">
                    {appointment.services?.name ?? 'Servicio'} con {appointment.employees?.name ?? 'empleado'} -{' '}
                    {appointment.status}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {appointment.client_email} {appointment.client_phone ? `- ${appointment.client_phone}` : ''}
                  </p>
                </div>
              ))}
              {appointments.length === 0 && <Empty text="No tiene citas." />}
            </div>
          </Panel>

          <Panel title="Notas internas">
            <AdminNoteComposer businessId={business.id} />
            <div className="mt-4 space-y-2">
              {((notesData ?? []) as AdminNote[]).map((note) => (
                <div key={note.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <p className="text-zinc-200">{note.note}</p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {note.admin_email ?? 'Admin'} - {formatDateTime(note.created_at)}
                  </p>
                </div>
              ))}
              {(notesData ?? []).length === 0 && <Empty text="Sin notas internas." />}
            </div>
          </Panel>
        </section>

        <Panel title="Historial admin">
          <div className="space-y-2">
            {((auditData ?? []) as AdminAuditLog[]).map((log) => (
              <div key={log.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-zinc-100">{log.action}</span>
                  <span className="text-xs text-zinc-500">{formatDateTime(log.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">{log.admin_email ?? 'Admin'}</p>
              </div>
            ))}
            {(auditData ?? []).length === 0 && <Empty text="Sin acciones registradas." />}
          </div>
        </Panel>
      </div>
    </main>
  )
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 break-words text-sm text-zinc-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="font-bold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">{text}</p>
}
