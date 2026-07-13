import Link from 'next/link'
import { requirePlatformAdmin } from '@/lib/admin'
import { formatCurrency } from '@/lib/utils'
import { AdminBusinessActions } from './AdminBusinessActions'

type BusinessRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  owner_id: string
  created_at: string
  is_paused?: boolean
  pause_reason?: string | null
  subscriptions:
    | {
        plan: 'trial' | 'basic' | 'plus'
        status: 'trial' | 'active' | 'cancelled' | 'past_due'
        trial_ends_at: string | null
        current_period_end: string | null
        current_period_start?: string | null
        last_payment_at?: string | null
        price_cents?: number
        currency?: string
        manual_override?: boolean
      }
    | null
  services: { id: string }[]
  employees: { id: string }[]
  appointments: { id: string; start_time: string; status: string }[]
  admin_subscription_payments?: {
    id: string
    amount_cents: number
    currency: string
    paid_at: string
    period_start: string
    period_end: string
    plan: 'basic' | 'plus'
    status?: 'paid' | 'voided'
  }[]
}

type AdminSearchParams = {
  q?: string
  status?: string
  plan?: string
}

type BusinessWithSubscription = BusinessRow & {
  subscriptions: BusinessRow['subscriptions']
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value))
}

function daysUntil(value?: string | null) {
  if (!value) return null
  const diff = new Date(value).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDueText(value?: string | null) {
  const days = daysUntil(value)
  if (days === null) return 'Sin fecha'
  if (days < 0) return `Vencido hace ${Math.abs(days)} dias`
  if (days === 0) return 'Vence hoy'
  return `Faltan ${days} dias`
}

function billingDate(business: BusinessWithSubscription) {
  const subscription = business.subscriptions
  return subscription?.status === 'trial' ? subscription.trial_ends_at : subscription?.current_period_end
}

function isOverdue(business: BusinessWithSubscription) {
  const days = daysUntil(billingDate(business))
  const status = business.subscriptions?.status
  return Boolean(status && ['trial', 'active', 'past_due'].includes(status) && days !== null && days < 0)
}

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/[^\d+]/g, '')
}

function statusTone(business: BusinessWithSubscription) {
  if (business.is_paused) return 'bg-red-500/10 text-red-200 border-red-500/20'
  if (isOverdue(business) || business.subscriptions?.status === 'past_due') {
    return 'bg-amber-500/10 text-amber-200 border-amber-500/20'
  }
  if (business.subscriptions?.status === 'active') return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
  return 'bg-zinc-800 text-zinc-300 border-zinc-700'
}

function statusLabel(business: BusinessWithSubscription) {
  if (business.is_paused) return 'Pausado'
  if (isOverdue(business)) return 'Vencido'
  return business.subscriptions?.status ?? 'trial'
}

export default async function AdminPage({ searchParams }: { searchParams?: Promise<AdminSearchParams> }) {
  const filters = (await searchParams) ?? {}
  const query = filters.q?.trim().toLowerCase() ?? ''
  const statusFilter = filters.status ?? 'all'
  const planFilter = filters.plan ?? 'all'
  const { supabase, user } = await requirePlatformAdmin()

  const { data, error } = await supabase
    .from('businesses')
    .select(
      `
        id,
        name,
        slug,
        phone,
        owner_id,
        created_at,
        is_paused,
        pause_reason,
        subscriptions(plan,status,trial_ends_at,current_period_start,current_period_end,last_payment_at,price_cents,currency,manual_override),
        services(id),
        employees(id),
        appointments(id,start_time,status),
        admin_subscription_payments(id,amount_cents,currency,paid_at,period_start,period_end,plan,status)
      `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
        <div className="mx-auto max-w-5xl rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error.message}
        </div>
      </main>
    )
  }

  const businesses = ((data ?? []) as unknown as BusinessRow[]).map((business) => ({
    ...business,
    subscriptions: Array.isArray(business.subscriptions)
      ? business.subscriptions[0] ?? null
      : business.subscriptions,
  })) as BusinessWithSubscription[]

  const filteredBusinesses = businesses.filter((business) => {
    const subscription = business.subscriptions
    const matchesQuery =
      !query ||
      business.name.toLowerCase().includes(query) ||
      business.slug.toLowerCase().includes(query) ||
      (business.phone ?? '').toLowerCase().includes(query)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paused'
        ? business.is_paused
        : statusFilter === 'overdue'
          ? isOverdue(business)
          : subscription?.status === statusFilter)
    const matchesPlan = planFilter === 'all' || subscription?.plan === planFilter

    return matchesQuery && matchesStatus && matchesPlan
  })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const payments = businesses
    .flatMap((business) => business.admin_subscription_payments ?? [])
    .filter((payment) => (payment.status ?? 'paid') === 'paid')
  const paidBusinesses = businesses.filter((business) => business.subscriptions?.status === 'active')
  const activeSubscriptions = paidBusinesses.length
  const trialSubscriptions = businesses.filter((business) => business.subscriptions?.status === 'trial').length
  const paused = businesses.filter((business) => business.is_paused).length
  const overdueBusinesses = businesses.filter(isOverdue)
  const expiringTrialBusinesses = businesses.filter((business) => {
    const days = daysUntil(business.subscriptions?.trial_ends_at)
    return business.subscriptions?.status === 'trial' && days !== null && days >= 0 && days <= 7
  })
  const inactiveSetupBusinesses = businesses.filter(
    (business) => business.services.length === 0 || business.employees.length === 0
  )
  const newThisWeek = businesses.filter((business) => new Date(business.created_at) >= weekStart).length
  const upcomingAppointments = businesses.reduce((sum, business) => {
    return sum + business.appointments.filter((appointment) => new Date(appointment.start_time) >= now).length
  }, 0)
  const monthlyCollectedCents = payments.reduce((sum, payment) => {
    return new Date(payment.paid_at) >= monthStart ? sum + payment.amount_cents : sum
  }, 0)
  const totalCollectedCents = payments.reduce((sum, payment) => sum + payment.amount_cents, 0)
  const monthlyRevenueCents = paidBusinesses.reduce((sum, business) => {
    return sum + (business.subscriptions?.price_cents ?? 0)
  }, 0)
  const arpaCents = activeSubscriptions ? Math.round(monthlyRevenueCents / activeSubscriptions) : 0
  const attentionBusinesses = [
    ...overdueBusinesses,
    ...businesses.filter((business) => business.subscriptions?.status === 'past_due'),
    ...expiringTrialBusinesses,
    ...businesses.filter((business) => business.is_paused),
    ...inactiveSetupBusinesses,
  ].filter((business, index, list) => list.findIndex((item) => item.id === business.id) === index)

  const primaryMetrics = [
    { label: 'MRR', value: formatCurrency(monthlyRevenueCents / 100), helper: `${activeSubscriptions} pagos activos` },
    { label: 'Cobrado mes', value: formatCurrency(monthlyCollectedCents / 100), helper: 'Pagos registrados' },
    { label: 'Alertas', value: attentionBusinesses.length, helper: 'Revisar hoy' },
    { label: 'Nuevos 7d', value: newThisWeek, helper: 'Altas recientes' },
  ]
  const secondaryMetrics = [
    { label: 'Negocios', value: businesses.length },
    { label: 'Trials', value: trialSubscriptions },
    { label: 'Vencidos', value: overdueBusinesses.length },
    { label: 'Pausados', value: paused },
    { label: 'Citas futuras', value: upcomingAppointments },
    { label: 'ARPA', value: formatCurrency(arpaCents / 100) },
    { label: 'Cobrado total', value: formatCurrency(totalCollectedCents / 100) },
  ]

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 pb-24 sm:px-4 md:px-6 md:py-6">
        <header className="sticky top-0 z-20 -mx-3 border-b border-zinc-800 bg-zinc-950/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4 md:static md:mx-0 md:rounded-2xl md:border md:bg-zinc-900/60 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                TurboAgenda Admin
              </p>
              <h1 className="mt-1 text-2xl font-black text-white md:text-4xl">Centro de control</h1>
              <p className="mt-1 truncate text-xs text-zinc-500 md:text-sm">Admin: {user.email}</p>
            </div>
            <Link
              href="/dashboard"
              className="shrink-0 rounded-xl border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-zinc-500 md:px-4 md:text-sm"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {primaryMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-black text-white md:text-3xl">{metric.value}</p>
              <p className="mt-1 text-[11px] text-zinc-500">{metric.helper}</p>
            </div>
          ))}
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1">
          {secondaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="min-w-28 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2"
            >
              <p className="text-[11px] text-zinc-500">{metric.label}</p>
              <p className="mt-1 text-lg font-black text-zinc-100">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <QuickLink href="/admin?status=overdue" label="Cobros vencidos" value={overdueBusinesses.length} />
          <QuickLink href="/admin?status=trial" label="Trials activos" value={trialSubscriptions} />
          <QuickLink href="/admin?status=paused" label="Negocios pausados" value={paused} />
        </section>

        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-amber-100">Necesitan atencion</h2>
              <p className="text-xs text-amber-100/60">Prioridad para revisar desde el telefono.</p>
            </div>
            <Link href="/admin?status=overdue" className="text-xs font-semibold text-amber-100 hover:text-white">
              Ver vencidos
            </Link>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {attentionBusinesses.slice(0, 6).map((business) => (
              <CompactBusinessCard key={business.id} business={business} />
            ))}
            {attentionBusinesses.length === 0 && (
              <p className="rounded-xl border border-amber-500/10 bg-zinc-950/40 p-3 text-sm text-zinc-400">
                No hay alertas importantes ahora mismo.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900">
          <div className="space-y-4 border-b border-zinc-800 p-4">
            <div>
              <h2 className="font-bold text-zinc-100">Negocios</h2>
              <p className="text-sm text-zinc-500">Busca, llama, abre ficha y registra cobros sin salir del movil.</p>
            </div>
            <form className="grid gap-2 md:grid-cols-[1fr_170px_170px_auto]" action="/admin">
              <input
                name="q"
                defaultValue={filters.q ?? ''}
                placeholder="Buscar negocio, slug o telefono"
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              />
              <select
                name="status"
                defaultValue={statusFilter}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                <option value="all">Todos estados</option>
                <option value="overdue">Vencidos</option>
                <option value="trial">Trial</option>
                <option value="active">Activo</option>
                <option value="past_due">Pago pendiente</option>
                <option value="cancelled">Cancelado</option>
                <option value="paused">Pausado</option>
              </select>
              <select
                name="plan"
                defaultValue={planFilter}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100"
              >
                <option value="all">Todos planes</option>
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="plus">Plus</option>
              </select>
              <button
                type="submit"
                className="h-11 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                Filtrar
              </button>
            </form>
            <p className="text-xs text-zinc-500">
              Mostrando {filteredBusinesses.length} de {businesses.length} negocios.
            </p>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {filteredBusinesses.map((business) => (
              <MobileBusinessCard key={business.id} business={business} />
            ))}
            {filteredBusinesses.length === 0 && <EmptyState />}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Cobros y fechas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredBusinesses.map((business) => (
                  <DesktopBusinessRow key={business.id} business={business} />
                ))}
                {filteredBusinesses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No hay negocios con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function QuickLink({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4 hover:border-emerald-500/40"
    >
      <span className="text-sm font-semibold text-zinc-200">{label}</span>
      <span className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-black text-emerald-300">{value}</span>
    </Link>
  )
}

function CompactBusinessCard({ business }: { business: BusinessWithSubscription }) {
  return (
    <Link href={`/admin/businesses/${business.id}`} className="rounded-xl border border-amber-500/10 bg-zinc-950/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">{business.name}</p>
          <p className="text-xs text-zinc-500">{formatDueText(billingDate(business))}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusTone(business)}`}>
          {statusLabel(business)}
        </span>
      </div>
    </Link>
  )
}

function MobileBusinessCard({ business }: { business: BusinessWithSubscription }) {
  const subscription = business.subscriptions
  const plan = subscription?.plan ?? 'trial'
  const status = subscription?.status ?? 'trial'
  const priceCents = subscription?.price_cents ?? 0
  const phone = normalizePhone(business.phone)
  const lastPayment = [...(business.admin_subscription_payments ?? [])]
    .filter((payment) => (payment.status ?? 'paid') === 'paid')
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-white">{business.name}</h3>
          <p className="text-xs text-zinc-500">/{business.slug}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusTone(business)}`}>
          {statusLabel(business)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Plan" value={plan} />
        <MiniStat label="MRR" value={formatCurrency(priceCents / 100)} />
        <MiniStat label="Citas" value={business.appointments.length} />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
        <div className="flex justify-between gap-3">
          <span>{status === 'trial' ? 'Trial' : 'Periodo'}</span>
          <span className={isOverdue(business) ? 'font-semibold text-red-300' : 'text-zinc-200'}>
            {formatDueText(billingDate(business))}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-3">
          <span>Servicios / equipo</span>
          <span className="text-zinc-200">
            {business.services.length} / {business.employees.length}
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-3">
          <span>Ultimo pago</span>
          <span className="text-zinc-200">
            {lastPayment ? `${formatCurrency(lastPayment.amount_cents / 100, lastPayment.currency)} · ${formatDate(lastPayment.paid_at)}` : 'Sin pago'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/admin/businesses/${business.id}`}
          className="rounded-xl bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
        >
          Abrir ficha
        </Link>
        <a
          href={`https://turboagenda.pt/b/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-100"
        >
          Ver publico
        </a>
        {phone ? (
          <>
            <a
              href={`tel:${phone}`}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-100"
            >
              Llamar
            </a>
            <a
              href={`https://wa.me/${phone.replace('+', '')}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-zinc-700 px-3 py-2 text-center text-sm font-semibold text-zinc-100"
            >
              WhatsApp
            </a>
          </>
        ) : (
          <span className="col-span-2 rounded-xl border border-zinc-800 px-3 py-2 text-center text-sm text-zinc-500">
            Sin telefono
          </span>
        )}
      </div>
    </article>
  )
}

function DesktopBusinessRow({ business }: { business: BusinessWithSubscription }) {
  const subscription = business.subscriptions
  const plan = subscription?.plan ?? 'trial'
  const status = subscription?.status ?? 'trial'
  const priceCents = subscription?.price_cents ?? 0
  const lastPayment = [...(business.admin_subscription_payments ?? [])]
    .filter((payment) => (payment.status ?? 'paid') === 'paid')
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]
  const dueDate = billingDate(business)

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="font-semibold text-zinc-100">{business.name}</div>
        <div className="mt-1 text-xs text-zinc-500">/{business.slug}</div>
        <div className="mt-1 text-xs text-zinc-500">{business.phone ?? 'Sin telefono'}</div>
        <a
          href={`https://turboagenda.pt/b/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Ver publico
        </a>
        <Link
          href={`/admin/businesses/${business.id}`}
          className="ml-3 inline-block text-xs font-semibold text-zinc-300 hover:text-white"
        >
          Abrir ficha
        </Link>
      </td>
      <td className="px-4 py-4">
        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
          {plan}
        </span>
        <div className="mt-2 text-xs text-zinc-500">{status}</div>
        <div className="mt-1 text-xs text-zinc-500">{formatCurrency(priceCents / 100)}/mes</div>
      </td>
      <td className="px-4 py-4 text-xs text-zinc-400">
        <div>{business.services.length} servicios</div>
        <div>{business.employees.length} empleados</div>
        <div>{business.appointments.length} citas</div>
      </td>
      <td className="px-4 py-4 text-xs text-zinc-400">
        <div>Alta: {formatDate(business.created_at)}</div>
        <div className={isOverdue(business) ? 'text-red-300' : ''}>
          {status === 'trial' ? 'Trial' : 'Pagado'}: {formatDate(dueDate)}
        </div>
        <div>{formatDueText(dueDate)}</div>
        {lastPayment ? (
          <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <div className="font-semibold text-emerald-300">
              Ultimo pago: {formatCurrency(lastPayment.amount_cents / 100, lastPayment.currency)}
            </div>
            <div>{formatDate(lastPayment.paid_at)}</div>
            <div>
              Cubre: {formatDate(lastPayment.period_start)} - {formatDate(lastPayment.period_end)}
            </div>
          </div>
        ) : (
          <div className="mt-2 text-zinc-600">Sin pagos registrados</div>
        )}
      </td>
      <td className="px-4 py-4">
        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(business)}`}>
          {statusLabel(business)}
        </span>
        {business.pause_reason && <p className="mt-2 max-w-[180px] text-xs text-zinc-500">{business.pause_reason}</p>}
      </td>
      <td className="px-4 py-4">
        <AdminBusinessActions
          businessId={business.id}
          isPaused={Boolean(business.is_paused)}
          plan={plan}
          status={status}
          priceCents={priceCents}
          trialEndsAt={subscription?.trial_ends_at}
          compact
        />
      </td>
    </tr>
  )
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-2">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-zinc-100">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="rounded-xl border border-dashed border-zinc-800 p-6 text-center text-sm text-zinc-500">
      No hay negocios con esos filtros.
    </p>
  )
}
