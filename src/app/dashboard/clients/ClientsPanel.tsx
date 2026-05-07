'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDateTime, statusLabel } from '@/lib/utils'
import type { AppointmentWithRelations, ClientSummary, CommunicationSettings } from '@/lib/client-management'
import { ReminderModal } from './ReminderModal'

interface ClientsPanelProps {
  clients: ClientSummary[]
  communication: CommunicationSettings
  publicUrl: string
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'none'
type SortMode = 'newest' | 'oldest' | 'name'

export function ClientsPanel({ clients, communication, publicUrl }: ClientsPanelProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

    return clients
      .filter((client) => {
        const matchesQuery =
          !q ||
          client.name.toLowerCase().includes(q) ||
          client.email.toLowerCase().includes(q) ||
          (client.phone ?? '').toLowerCase().includes(q)
        const matchesStatus = status === 'all' || client.latest_status === status
        const lastTime = client.last_appointment ? new Date(client.last_appointment.start_time).getTime() : null
        const matchesFrom = !from || (lastTime !== null && lastTime >= from)
        const matchesTo = !to || (lastTime !== null && lastTime <= to)
        return matchesQuery && matchesStatus && matchesFrom && matchesTo
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name)
        const aTime = a.last_appointment ? new Date(a.last_appointment.start_time).getTime() : 0
        const bTime = b.last_appointment ? new Date(b.last_appointment.start_time).getTime() : 0
        return sort === 'newest' ? bTime - aTime : aTime - bTime
      })
  }, [clients, dateFrom, dateTo, query, sort, status])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Clientes</h1>
          <p className="text-sm text-zinc-500">Historial, busqueda e invitaciones para volver a reservar.</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
          <span className="font-semibold text-zinc-100">{clients.length}</span> clientes registrados
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          label="Buscar"
          placeholder="Nombre, email o telefono"
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-300">Estado</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
            <option value="none">Sin citas</option>
          </select>
        </label>
        <Input label="Desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Input label="Hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-300">Orden</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Mas reciente</option>
            <option value="oldest">Mas antiguo</option>
            <option value="name">Nombre</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:grid">
          <span>Cliente</span>
          <span>Contacto</span>
          <span>Ultima cita</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">No hay clientes que coincidan con los filtros.</div>
        ) : (
          filtered.map((client) => (
            <div
              key={client.id}
              className="grid gap-3 border-b border-zinc-800 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.9fr] md:items-center"
            >
              <div className="min-w-0">
                <Link href={`/dashboard/clients/${client.id}`} className="font-semibold text-zinc-100 hover:text-emerald-300">
                  {client.name}
                </Link>
                <div className="text-xs text-zinc-500">{client.appointment_count} citas</div>
              </div>
              <div className="min-w-0 text-sm text-zinc-300">
                <div className="truncate">{client.email}</div>
                <div className="text-xs text-zinc-500">{client.phone || 'Sin telefono'}</div>
              </div>
              <div className="text-sm text-zinc-300">
                {client.last_appointment ? formatDateTime(client.last_appointment.start_time) : 'Sin citas'}
              </div>
              <div>
                <span className={statusPill(client.latest_status)}>{statusLabel(client.latest_status)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSelectedClient(client)}>
                  Invitar a volver
                </Button>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
                >
                  Ver
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <ReminderModal
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        appointments={selectedClient ? compactAppointments(selectedClient) : []}
        communication={communication}
        publicUrl={publicUrl}
      />
    </div>
  )
}

function compactAppointments(client: ClientSummary): AppointmentWithRelations[] {
  const ids = new Set<string>()
  return [client.next_appointment, client.last_appointment].filter((appointment): appointment is AppointmentWithRelations => {
    if (!appointment || ids.has(appointment.id)) return false
    ids.add(appointment.id)
    return true
  })
}

function statusPill(status: ClientSummary['latest_status']) {
  const base = 'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold'
  if (status === 'confirmed') return `${base} bg-emerald-500/10 text-emerald-300`
  if (status === 'pending') return `${base} bg-amber-500/10 text-amber-300`
  if (status === 'cancelled') return `${base} bg-red-500/10 text-red-300`
  if (status === 'completed') return `${base} bg-blue-500/10 text-blue-300`
  return `${base} bg-zinc-800 text-zinc-400`
}
