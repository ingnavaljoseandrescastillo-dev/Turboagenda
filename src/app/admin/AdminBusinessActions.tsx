'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Plan = 'trial' | 'basic' | 'plus' | 'pro'
type Status = 'trial' | 'active' | 'cancelled' | 'past_due'

interface AdminBusinessActionsProps {
  businessId: string
  isPaused: boolean
  plan: Plan
  status: Status
  priceCents: number
  trialEndsAt?: string | null
}

export function AdminBusinessActions({
  businessId,
  isPaused,
  plan,
  status,
  priceCents,
  trialEndsAt,
}: AdminBusinessActionsProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <option value="pro">pro</option>
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
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
