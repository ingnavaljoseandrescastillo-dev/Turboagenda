'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn, formatCurrency } from '@/lib/utils'
import type { FinanceEntry } from '@/types'

type EntryType = 'income' | 'expense'
type ApiResponse<T> = { data: T | null; error: string | null }

interface FinancePanelProps {
  initialEntries: FinanceEntry[]
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

export function FinancePanel({ initialEntries }: FinancePanelProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [form, setForm] = useState<EntryForm>(emptyForm)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
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
    </div>
  )
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
