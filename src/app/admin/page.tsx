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
        plan: 'trial' | 'basic' | 'plus' | 'pro'
        status: 'trial' | 'active' | 'cancelled' | 'past_due'
        trial_ends_at: string | null
        current_period_end: string | null
        price_cents?: number
        currency?: string
        manual_override?: boolean
      }
    | null
  services: { id: string }[]
  employees: { id: string }[]
  appointments: { id: string; start_time: string; status: string }[]
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function AdminPage() {
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
        subscriptions(plan,status,trial_ends_at,current_period_end,price_cents,currency,manual_override),
        services(id),
        employees(id),
        appointments(id,start_time,status)
      `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
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
  }))
  const total = businesses.length
  const paused = businesses.filter((business) => business.is_paused).length
  const activeSubscriptions = businesses.filter((business) => business.subscriptions?.status === 'active').length
  const trialSubscriptions = businesses.filter((business) => business.subscriptions?.status === 'trial').length
  const monthlyRevenueCents = businesses.reduce((sum, business) => {
    const subscription = business.subscriptions
    if (!subscription || subscription.status !== 'active') return sum
    return sum + (subscription.price_cents ?? 0)
  }, 0)
  const totalAppointments = businesses.reduce((sum, business) => sum + business.appointments.length, 0)

  const metrics = [
    { label: 'Negocios', value: total },
    { label: 'Activos pago', value: activeSubscriptions },
    { label: 'Trials', value: trialSubscriptions },
    { label: 'Pausados', value: paused },
    { label: 'Citas', value: totalAppointments },
    { label: 'MRR estimado', value: formatCurrency(monthlyRevenueCents / 100) },
  ]

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-3 border-b border-zinc-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">TurboAgenda Admin</p>
            <h1 className="mt-1 text-3xl font-black text-white">Panel interno</h1>
            <p className="mt-1 text-sm text-zinc-500">Sesion admin: {user.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-500"
          >
            Volver al dashboard
          </Link>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-black text-white">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-4 py-3">
            <h2 className="font-bold text-zinc-100">Negocios registrados</h2>
            <p className="text-sm text-zinc-500">Control manual de planes, pausas y estado de cuenta.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Negocio</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Uso</th>
                  <th className="px-4 py-3">Fechas</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {businesses.map((business) => {
                  const subscription = business.subscriptions
                  const plan = subscription?.plan ?? 'trial'
                  const status = subscription?.status ?? 'trial'
                  const priceCents = subscription?.price_cents ?? 0

                  return (
                    <tr key={business.id} className="align-top">
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
                        <div>Trial: {formatDate(subscription?.trial_ends_at)}</div>
                        <div>Periodo: {formatDate(subscription?.current_period_end)}</div>
                      </td>
                      <td className="px-4 py-4">
                        {business.is_paused ? (
                          <div>
                            <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300">
                              Pausado
                            </span>
                            {business.pause_reason && (
                              <p className="mt-2 max-w-[180px] text-xs text-zinc-500">{business.pause_reason}</p>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                            Operativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <AdminBusinessActions
                          businessId={business.id}
                          isPaused={Boolean(business.is_paused)}
                          plan={plan}
                          status={status}
                          priceCents={priceCents}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
