'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { Appointment, FinanceEntry } from '@/types'

type EntryType = 'income' | 'expense'
type ApiResponse<T> = { data: T | null; error: string | null }

interface FinancePanelProps {
  initialEntries: FinanceEntry[]
  pastAppointments: Appointment[]
}

interface EntryForm {
  type: EntryType
  category: string
  description: string
  amount: string
  currency: string
  entry_date: string
  payment_method: string
  notes: string
}

interface CollectionForm {
  appointment: Appointment
  entry: FinanceEntry | null
  grossAmount: string
  discount: string
  amount: string
  entryDate: string
  paymentMethod: string
  notes: string
}

const today = new Date().toISOString().slice(0, 10)
const currentMonth = today.slice(0, 7)

const emptyForm: EntryForm = {
  type: 'income',
  category: 'servicio',
  description: '',
  amount: '',
  currency: 'EUR',
  entry_date: today,
  payment_method: 'manual',
  notes: '',
}

const incomeCategories = ['servicio', 'producto', 'propina', 'bono', 'otro']
const expenseCategories = ['materiales', 'comision', 'alquiler', 'publicidad', 'herramientas', 'impuestos', 'otro']
const paymentMethods = ['manual', 'efectivo', 'mbway', 'transferencia', 'tarjeta', 'otro']

export function FinancePanel({ initialEntries, pastAppointments }: FinancePanelProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [appointments, setAppointments] = useState(pastAppointments)
  const [form, setForm] = useState<EntryForm>(emptyForm)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  const [collecting, setCollecting] = useState<CollectionForm | null>(null)
  const [month, setMonth] = useState(currentMonth)
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries
      .filter((entry) => !month || entry.entry_date.startsWith(month))
      .filter((entry) => typeFilter === 'all' || entry.type === typeFilter)
      .filter((entry) => {
        if (!q) return true
        return (
          entry.description.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q) ||
          entry.payment_method.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at))
  }, [entries, month, query, typeFilter])

  const totals = useMemo(() => {
    const income = visibleEntries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount_cents, 0)
    const expenses = visibleEntries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount_cents, 0)
    return { income, expenses, net: income - expenses }
  }, [visibleEntries])

  const expenseByCategory = useMemo(() => {
    const totalsByCategory = new Map<string, number>()
    visibleEntries
      .filter((entry) => entry.type === 'expense')
      .forEach((entry) => {
        totalsByCategory.set(entry.category, (totalsByCategory.get(entry.category) ?? 0) + entry.amount_cents)
      })

    return Array.from(totalsByCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [visibleEntries])

  const availableCategories = form.type === 'income' ? incomeCategories : expenseCategories
  const appointmentIncomeById = useMemo(
    () =>
      new Map(
        entries
          .filter((entry) => entry.type === 'income' && entry.appointment_id)
          .map((entry) => [entry.appointment_id as string, entry])
      ),
    [entries]
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const amount = Number.parseFloat(form.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Introduce un importe valido.')
      return
    }

    const payload = {
      type: form.type,
      category: form.category,
      description: form.description,
      amount_cents: Math.round(amount * 100),
      currency: form.currency,
      entry_date: form.entry_date,
      payment_method: form.payment_method,
      notes: form.notes || null,
      appointment_id: null,
      employee_id: null,
    }

    setSaving(true)
    try {
      const response = await fetch(editing ? `/api/finances/${editing.id}` : '/api/finances', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as ApiResponse<FinanceEntry>
      if (!response.ok || !result.data) throw new Error(result.error ?? 'No fue posible guardar el movimiento.')

      setEntries((current) =>
        editing
          ? current.map((entry) => (entry.id === result.data!.id ? result.data! : entry))
          : [result.data!, ...current]
      )
      setForm(emptyForm)
      setEditing(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible guardar el movimiento.'
      console.error('[FinancePanel] save failed', err)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEntry(entry: FinanceEntry) {
    if (!window.confirm(`Eliminar "${entry.description}" de la contabilidad?`)) return
    setError('')

    try {
      const response = await fetch(`/api/finances/${entry.id}`, { method: 'DELETE' })
      const result = (await response.json()) as ApiResponse<{ id: string }>
      if (!response.ok) throw new Error(result.error ?? 'No fue posible eliminar el movimiento.')
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      if (editing?.id === entry.id) cancelEdit()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible eliminar el movimiento.'
      console.error('[FinancePanel] delete failed', err)
      setError(message)
    }
  }

  async function saveAppointmentCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!collecting) return
    setSaving(true)
    setError('')

    const grossAmount = parseMoney(collecting.grossAmount)
    const discount = parseMoney(collecting.discount)
    const amount = parseMoney(collecting.amount)
    if (grossAmount === null || discount === null || amount === null || discount > grossAmount) {
      setError('Revisa el importe original, el descuento y el total cobrado.')
      setSaving(false)
      return
    }

    const payload = {
      type: 'income' as const,
      category: 'servicio',
      description: `${collecting.appointment.service?.name ?? 'Servicio'} - ${collecting.appointment.client_name}`,
      amount_cents: amount,
      gross_amount_cents: grossAmount,
      discount_cents: discount,
      currency: collecting.entry?.currency ?? 'EUR',
      entry_date: collecting.entryDate,
      payment_method: collecting.paymentMethod,
      notes: collecting.notes || null,
      appointment_id: collecting.appointment.id,
      employee_id: collecting.appointment.employee_id,
    }

    try {
      const response = await fetch(
        collecting.entry
          ? `/api/finances/${collecting.entry.id}`
          : `/api/finances/appointments/${collecting.appointment.id}/collect`,
        {
          method: collecting.entry ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            collecting.entry
              ? payload
              : {
                  amount_cents: payload.amount_cents,
                  gross_amount_cents: payload.gross_amount_cents,
                  discount_cents: payload.discount_cents,
                  currency: payload.currency,
                  entry_date: payload.entry_date,
                  payment_method: payload.payment_method,
                  notes: payload.notes,
                }
          ),
        }
      )
      const result = (await response.json()) as ApiResponse<FinanceEntry>
      if (!response.ok || !result.data) throw new Error(result.error ?? 'No fue posible confirmar el cobro.')

      setEntries((current) =>
        collecting.entry
          ? current.map((entry) => (entry.id === result.data!.id ? result.data! : entry))
          : [result.data!, ...current]
      )
      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === collecting.appointment.id ? { ...appointment, status: 'completed' } : appointment
        )
      )
      setCollecting(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible confirmar el cobro.'
      console.error('[FinancePanel] appointment charge failed', err)
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(entry: FinanceEntry) {
    setEditing(entry)
    setForm({
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: (entry.amount_cents / 100).toString(),
      currency: entry.currency,
      entry_date: entry.entry_date,
      payment_method: entry.payment_method,
      notes: entry.notes ?? '',
    })
  }

  function cancelEdit() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Finanzas</h1>
          <p className="text-sm text-zinc-500">
            Control manual de ingresos, gastos y ganancia neta del negocio.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[520px]">
          <MetricCard label="Ingresos" value={formatCurrency(totals.income / 100)} tone="income" />
          <MetricCard label="Gastos" value={formatCurrency(totals.expenses / 100)} tone="expense" />
          <MetricCard label="Neto" value={formatCurrency(totals.net / 100)} tone={totals.net >= 0 ? 'income' : 'expense'} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div>
            <h2 className="font-semibold text-zinc-100">
              {editing ? 'Editar movimiento' : 'Nuevo movimiento'}
            </h2>
            <p className="text-xs text-zinc-500">Registra cobros reales y gastos del dia a dia.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, type: 'income', category: 'servicio' }))}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                form.type === 'income'
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-400'
              )}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, type: 'expense', category: 'materiales' }))}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                form.type === 'expense'
                  ? 'border-red-500 bg-red-500/15 text-red-200'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-400'
              )}
            >
              Gasto
            </button>
          </div>

          <Input
            label="Descripcion"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Ej. Corte, material, comision"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Importe"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              required
            />
            <Input
              label="Fecha"
              type="date"
              value={form.entry_date}
              onChange={(event) => setForm((current) => ({ ...current, entry_date: event.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Categoria"
              value={form.category}
              options={availableCategories}
              onChange={(value) => setForm((current) => ({ ...current, category: value }))}
            />
            <SelectField
              label="Metodo"
              value={form.payment_method}
              options={paymentMethods}
              onChange={(value) => setForm((current) => ({ ...current, payment_method: value }))}
            />
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-zinc-300">Notas</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Detalle opcional"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" loading={saving} className="flex-1">
              {editing ? 'Guardar cambios' : 'Registrar movimiento'}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-[1fr_0.8fr_0.8fr]">
            <Input label="Mes" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <SelectField
              label="Tipo"
              value={typeFilter}
              options={['all', 'income', 'expense']}
              labels={{ all: 'Todos', income: 'Ingresos', expense: 'Gastos' }}
              onChange={(value) => setTypeFilter(value as 'all' | EntryType)}
            />
            <Input
              label="Buscar"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Categoria, descripcion o metodo"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="hidden grid-cols-[0.8fr_1.3fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
                <span>Fecha</span>
                <span>Movimiento</span>
                <span>Categoria</span>
                <span>Importe</span>
                <span>Acciones</span>
              </div>

              {visibleEntries.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-zinc-500">
                  Aun no hay movimientos para estos filtros.
                </div>
              ) : (
                visibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid gap-3 border-b border-zinc-800 px-4 py-4 last:border-b-0 md:grid-cols-[0.8fr_1.3fr_0.8fr_0.8fr_0.9fr] md:items-center"
                  >
                    <div className="text-sm text-zinc-300">{formatEntryDate(entry.entry_date)}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-100">{entry.description}</div>
                      <div className="text-xs text-zinc-500">{entry.payment_method}</div>
                    </div>
                    <div>
                      <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-300">
                        {entry.category}
                      </span>
                    </div>
                    <div className={cn('font-bold', entry.type === 'income' ? 'text-emerald-300' : 'text-red-300')}>
                      {entry.type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount_cents / 100, entry.currency)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(entry)}>
                        Editar
                      </Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => deleteEntry(entry)}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="font-semibold text-zinc-100">Gastos por categoria</h2>
              <p className="mb-4 text-xs text-zinc-500">Top del periodo filtrado.</p>
              {expenseByCategory.length === 0 ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-500">
                  Sin gastos registrados.
                </div>
              ) : (
                <div className="space-y-3">
                  {expenseByCategory.map((item) => (
                    <div key={item.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="capitalize text-zinc-300">{item.category}</span>
                        <span className="font-semibold text-zinc-100">{formatCurrency(item.amount / 100)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${Math.max(8, (item.amount / Math.max(totals.expenses, 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Historial de citas realizadas</h2>
          <p className="text-sm text-zinc-500">
            Confirma el cobro real de las citas pasadas antes de sumarlo a tus ingresos.
          </p>
        </div>

        {appointments.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-500">
            Aun no hay citas pasadas para registrar.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {appointments.map((appointment) => {
              const entry = appointmentIncomeById.get(appointment.id) ?? null
              return (
                <div
                  key={appointment.id}
                  className="grid gap-3 border-b border-zinc-800 bg-zinc-950/40 px-4 py-4 last:border-b-0 lg:grid-cols-[1.05fr_1fr_0.7fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-100">{appointment.client_name}</p>
                    <p className="truncate text-sm text-zinc-400">
                      {appointment.service?.name ?? 'Servicio'} con {appointment.employee?.name ?? 'equipo'}
                    </p>
                  </div>
                  <div className="text-sm text-zinc-300">
                    <p>{formatDateTime(appointment.start_time)}</p>
                    <p className="text-xs text-zinc-500">{appointmentStatusLabel(appointment.status)}</p>
                  </div>
                  <div>
                    {entry ? (
                      <>
                        <p className="font-bold text-emerald-300">{formatCurrency(entry.amount_cents / 100)}</p>
                        {entry.discount_cents ? (
                          <p className="text-xs text-zinc-500">
                            Descuento {formatCurrency(entry.discount_cents / 100)}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500">Cobro confirmado</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-zinc-200">
                          {formatCurrency(servicePriceCents(appointment) / 100)}
                        </p>
                        <p className="text-xs text-amber-300">Pendiente de cobro</p>
                      </>
                    )}
                  </div>
                  <Button type="button" size="sm" variant={entry ? 'secondary' : 'primary'} onClick={() => openCharge(appointment, entry)}>
                    {entry ? 'Editar cobro' : 'Confirmar cobro'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {collecting && (
          <form
            onSubmit={saveAppointmentCharge}
            className="grid gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 lg:grid-cols-[1fr_1fr]"
          >
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-zinc-100">
                {collecting.entry ? 'Editar cobro' : 'Confirmar cobro'}: {collecting.appointment.client_name}
              </h3>
              <p className="text-xs text-zinc-500">
                {collecting.appointment.service?.name ?? 'Servicio'} del {formatDateTime(collecting.appointment.start_time)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
              <Input
                label="Precio original"
                type="number"
                min="0"
                step="0.01"
                value={collecting.grossAmount}
                onChange={(event) => changeCollectionMoney('grossAmount', event.target.value)}
              />
              <Input
                label="Descuento"
                type="number"
                min="0"
                step="0.01"
                value={collecting.discount}
                onChange={(event) => changeCollectionMoney('discount', event.target.value)}
              />
              <Input
                label="Total cobrado"
                type="number"
                min="0"
                step="0.01"
                value={collecting.amount}
                onChange={(event) => setCollecting((current) => current && { ...current, amount: event.target.value })}
              />
            </div>
            <Input
              label="Fecha del cobro"
              type="date"
              value={collecting.entryDate}
              onChange={(event) => setCollecting((current) => current && { ...current, entryDate: event.target.value })}
            />
            <SelectField
              label="Metodo"
              value={collecting.paymentMethod}
              options={paymentMethods}
              onChange={(value) => setCollecting((current) => current && { ...current, paymentMethod: value })}
            />
            <label className="flex flex-col gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium text-zinc-300">Notas del cobro</span>
              <textarea
                value={collecting.notes}
                onChange={(event) => setCollecting((current) => current && { ...current, notes: event.target.value })}
                rows={2}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej. Descuento fidelidad, cobro parcial o detalle del pago"
              />
            </label>
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <Button type="submit" loading={saving}>
                {collecting.entry ? 'Guardar cobro' : 'Finalizar cita y sumar ingreso'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCollecting(null)}>
                Cerrar
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  )

  function openCharge(appointment: Appointment, entry: FinanceEntry | null) {
    const gross = entry?.gross_amount_cents ?? servicePriceCents(appointment)
    const discount = entry?.discount_cents ?? 0
    setError('')
    setCollecting({
      appointment,
      entry,
      grossAmount: moneyInput(gross),
      discount: moneyInput(discount),
      amount: moneyInput(entry?.amount_cents ?? Math.max(0, gross - discount)),
      entryDate: entry?.entry_date ?? appointment.start_time.slice(0, 10),
      paymentMethod: entry?.payment_method ?? 'manual',
      notes: entry?.notes ?? '',
    })
  }

  function changeCollectionMoney(field: 'grossAmount' | 'discount', value: string) {
    setCollecting((current) => {
      if (!current) return current
      const next = { ...current, [field]: value }
      const gross = parseMoney(next.grossAmount)
      const discount = parseMoney(next.discount)
      if (gross !== null && discount !== null) next.amount = moneyInput(Math.max(0, gross - discount))
      return next
    })
  }
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className={cn('mt-1 text-lg font-bold sm:text-xl', tone === 'income' ? 'text-emerald-300' : 'text-red-300')}>
        {value}
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  labels?: Record<string, string>
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  )
}

function formatEntryDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function parseMoney(value: string) {
  const amount = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null
}

function moneyInput(cents: number) {
  return (cents / 100).toFixed(2)
}

function servicePriceCents(appointment: Appointment) {
  return Math.round(Number(appointment.service?.price ?? 0) * 100)
}

function appointmentStatusLabel(status: Appointment['status']) {
  const labels = {
    pending: 'Pendiente en agenda',
    confirmed: 'Confirmada',
    completed: 'Finalizada',
    cancelled: 'Cancelada',
  }
  return labels[status]
}
