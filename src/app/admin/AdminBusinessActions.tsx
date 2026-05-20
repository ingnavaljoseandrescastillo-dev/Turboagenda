'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Plan = 'trial' | 'basic' | 'plus'
type Status = 'trial' | 'active' | 'cancelled' | 'past_due'

const PLAN_PRICES: Record<Exclude<Plan, 'trial'>, number> = {
  basic: 1499,
  plus: 2499,
}

interface AdminBusinessActionsProps {
  businessId: string
  isPaused: boolean
  plan: Plan
  status: Status
  priceCents: number
  trialEndsAt?: string | null
  compact?: boolean
}

export function AdminBusinessActions({
  businessId,
  isPaused,
  plan,
  status,
  priceCents,
  trialEndsAt,
  compact = false,
}: AdminBusinessActionsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialPaymentPlan = plan === 'trial' ? 'basic' : plan
  const [paymentPlan, setPaymentPlan] = useState<Exclude<Plan, 'trial'>>(initialPaymentPlan)
  const [paymentAmount, setPaymentAmount] = useState(
    String(Math.round((priceCents > 0 ? priceCents : PLAN_PRICES[initialPaymentPlan]) / 100))
  )
  const [paymentMonths, setPaymentMonths] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState('whatsapp')
  const [paymentReference, setPaymentReference] = useState('')

  async function patch(payload: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    } finally {
      setSaving(false)
    }
  }

  function extendTrial(days: number) {
    const base = trialEndsAt ? new Date(trialEndsAt) : new Date()
    const start = Number.isNaN(base.getTime()) || base < new Date() ? new Date() : base
    start.setDate(start.getDate() + days)
    patch({ status: 'trial', trial_ends_at: start.toISOString() })
  }

  async function recordPayment() {
    const amount = Math.max(0, Number(paymentAmount) || 0)
    const months = Math.max(1, Number(paymentMonths) || 1)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: paymentPlan,
          amount_cents: Math.round(amount * 100),
          months,
          method: paymentMethod,
          reference: paymentReference || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo registrar el pago')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Plan"
          defaultValue={plan}
          disabled={saving}
          onChange={(event) => patch({ plan: event.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        >
          <option value="trial">trial</option>
          <option value="basic">basic</option>
          <option value="plus">plus</option>
        </select>
        <select
          aria-label="Estado"
          defaultValue={status}
          disabled={saving}
          onChange={(event) => patch({ status: event.target.value })}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        >
          <option value="trial">trial</option>
          <option value="active">active</option>
          <option value="past_due">past_due</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          aria-label="Precio mensual"
          type="number"
          min={0}
          defaultValue={Math.round(priceCents / 100)}
          disabled={saving}
          onBlur={(event) => patch({ price_cents: Math.max(0, Number(event.target.value) || 0) * 100 })}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => patch({ is_paused: !isPaused, pause_reason: isPaused ? null : 'Paused manually by admin' })}
          className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
            isPaused
              ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
              : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
          }`}
        >
          {isPaused ? 'Reactivar' : 'Pausar'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => extendTrial(7)}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
        >
          +7d trial
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => extendTrial(30)}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
        >
          +30d
        </button>
        <Link
          href={`/admin/businesses/${businessId}`}
          className="rounded-lg border border-zinc-700 px-2 py-2 text-center text-xs font-semibold text-emerald-300 hover:border-emerald-500"
        >
          Ficha
        </Link>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
        <p className="mb-1 text-xs font-semibold text-emerald-200">Cobro manual</p>
        <p className="mb-2 text-[11px] text-zinc-500">
          Guarda el pago en tu contabilidad y deja el plan activo por los meses elegidos.
        </p>
        <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          <select
            aria-label="Plan pagado"
            value={paymentPlan}
            disabled={saving}
            onChange={(event) => {
              const nextPlan = event.target.value as Exclude<Plan, 'trial'>
              setPaymentPlan(nextPlan)
              setPaymentAmount(String(Math.round(PLAN_PRICES[nextPlan] / 100)))
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          >
            <option value="basic">basic</option>
            <option value="plus">plus</option>
          </select>
          <input
            aria-label="Importe cobrado"
            type="number"
            min={0}
            step="0.01"
            value={paymentAmount}
            disabled={saving}
            onChange={(event) => setPaymentAmount(event.target.value)}
            placeholder="Importe EUR"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          />
          <select
            aria-label="Meses cubiertos"
            value={paymentMonths}
            disabled={saving}
            onChange={(event) => setPaymentMonths(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          >
            <option value="1">1 mes</option>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
          <select
            aria-label="Metodo de pago"
            value={paymentMethod}
            disabled={saving}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="mbway">MB Way</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
          <input
            aria-label="Referencia del pago"
            value={paymentReference}
            disabled={saving}
            onChange={(event) => setPaymentReference(event.target.value)}
            placeholder="Referencia opcional"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          />
          <button
            type="button"
            disabled={saving}
            onClick={recordPayment}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            Guardar cobro
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
