'use client'

import { useState } from 'react'

interface PublicLinkCardProps {
  slug: string
}

const PUBLIC_ORIGIN = 'https://turboagenda.pt'

export function PublicLinkCard({ slug }: PublicLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const publicUrl = `${PUBLIC_ORIGIN}/b/${slug}`
  const bookingUrl = `${publicUrl}/book`

  async function copyLink() {
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Link publico</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-100">Comparte tu agenda con clientes</h2>
          <p className="mt-1 truncate text-sm text-zinc-400">{bookingUrl}</p>
        </div>
        <div className="flex flex-shrink-0 gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-600"
          >
            Ver pagina
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      </div>
    </div>
  )
}
