'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function AdminNoteComposer({ businessId }: { businessId: string }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'No se pudo guardar la nota')
      setNote('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la nota')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submitNote} className="space-y-3">
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Escribe una nota interna de soporte, cobro o seguimiento..."
        className="min-h-28 w-full resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
      />
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
        <button
          type="submit"
          disabled={saving || note.trim().length < 3}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </form>
  )
}
