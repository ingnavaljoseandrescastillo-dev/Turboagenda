'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type PaymentStatus = 'paid' | 'voided'

interface AdminPaymentActionsProps {
  businessId: string
  paymentId: string
  status: PaymentStatus
  method: string
  reference: string | null
  notes: string | null
}

export function AdminPaymentActions({
  businessId,
  paymentId,
  status,
  method,
  reference,
  notes,
}: AdminPaymentActionsProps) {
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState(method)
  const [paymentReference, setPaymentReference] = useState(reference ?? '')
  const [paymentNotes, setPaymentNotes] = useState(notes ?? '')
  const [voidReason, setVoidReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function updatePayment(payload: Record<string, unknown>) {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar el cobro')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el cobro')
    } finally {
      setSaving(false)
    }
  }

  function saveMetadata() {
    updatePayment({
      method: paymentMethod,
      reference: paymentReference || null,
      notes: paymentNotes || null,
    })
  }

  function voidPayment() {
    const confirmed = window.confirm(
      'Este cobro se marcara como anulado, dejara de contar en ingresos y se recalculara la suscripcion. Continuar?'
    )

    if (!confirmed) return

    updatePayment({
      status: 'voided',
      voided_reason: voidReason || 'Anulado manualmente por admin',
    })
  }

  if (status === 'voided') {
    return (
      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-200">
        Cobro anulado. No cuenta como ingreso ni mantiene activa la suscripcion.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          aria-label="Metodo del cobro"
          value={paymentMethod}
          disabled={saving}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        />
        <input
          aria-label="Referencia del cobro"
          value={paymentReference}
          disabled={saving}
          onChange={(event) => setPaymentReference(event.target.value)}
          placeholder="Referencia"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        />
        <button
          type="button"
          disabled={saving}
          onClick={saveMetadata}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-100 hover:border-zinc-500 disabled:opacity-60"
        >
          Guardar datos
        </button>
      </div>
      <textarea
        aria-label="Notas del cobro"
        value={paymentNotes}
        disabled={saving}
        onChange={(event) => setPaymentNotes(event.target.value)}
        placeholder="Notas internas del cobro"
        rows={2}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          aria-label="Motivo de anulacion"
          value={voidReason}
          disabled={saving}
          onChange={(event) => setVoidReason(event.target.value)}
          placeholder="Motivo para anular, por ejemplo: pago no confirmado"
          className="rounded-lg border border-red-500/30 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
        />
        <button
          type="button"
          disabled={saving}
          onClick={voidPayment}
          className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
        >
          Anular cobro
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
