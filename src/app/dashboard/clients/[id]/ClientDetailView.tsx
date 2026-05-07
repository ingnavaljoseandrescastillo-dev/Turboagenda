'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatDateTime, statusLabel } from '@/lib/utils'
import type { ClientDetail, CommunicationSettings } from '@/lib/client-management'
import { ReminderModal } from '../ReminderModal'

interface ClientDetailViewProps {
  client: ClientDetail
  communication: CommunicationSettings
  publicUrl: string
}

export function ClientDetailView({ client, communication, publicUrl }: ClientDetailViewProps) {
  const [showReminder, setShowReminder] = useState(false)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/clients" className="text-sm font-medium text-emerald-300 hover:text-emerald-200">
            Volver a clientes
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-100">{client.name}</h1>
          <p className="text-sm text-zinc-500">{client.email} {client.phone ? `- ${client.phone}` : ''}</p>
        </div>
        <Button onClick={() => setShowReminder(true)} disabled={client.appointments.length === 0}>
          Enviar recordatorio
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Citas" value={String(client.appointment_count)} />
        <StatCard label="Estado reciente" value={statusLabel(client.latest_status)} />
        <StatCard
          label="Proxima cita"
          value={client.next_appointment ? formatDateTime(client.next_appointment.start_time) : 'Sin proxima cita'}
        />
        <StatCard
          label="Cumpleanos"
          value={client.birthdate ? formatBirthdate(client.birthdate) : 'No registrado'}
        />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-4 py-4">
          <h2 className="font-semibold text-zinc-100">Historial de citas</h2>
          <p className="text-sm text-zinc-500">Servicios, profesional, fecha y estado.</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {client.appointments.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">Este cliente aun no tiene citas.</div>
          ) : (
            client.appointments.map((appointment) => (
              <div key={appointment.id} className="grid gap-2 px-4 py-4 md:grid-cols-[1fr_1fr_0.8fr_0.6fr] md:items-center">
                <div>
                  <div className="font-medium text-zinc-100">{appointment.service?.name ?? 'Servicio'}</div>
                  <div className="text-xs text-zinc-500">{appointment.employee?.name ?? 'Profesional'}</div>
                </div>
                <div className="text-sm text-zinc-300">{formatDateTime(appointment.start_time)}</div>
                <div className="text-sm text-zinc-500">{appointment.notes || 'Sin notas'}</div>
                <div>
                  <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                    {statusLabel(appointment.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-4 py-4">
          <h2 className="font-semibold text-zinc-100">Recordatorios enviados</h2>
          <p className="text-sm text-zinc-500">Canal, contenido y estado de cada intento.</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {client.reminders.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">Aun no hay recordatorios para este cliente.</div>
          ) : (
            client.reminders.map((reminder) => (
              <div key={reminder.id} className="grid gap-2 px-4 py-4 md:grid-cols-[0.8fr_0.7fr_1.8fr_0.6fr]">
                <div className="text-sm text-zinc-300">{formatDateTime(reminder.created_at)}</div>
                <div className="text-sm font-semibold capitalize text-zinc-100">{reminder.channel}</div>
                <div className="text-sm text-zinc-400">{String(reminder.payload?.message ?? reminder.payload?.message_template ?? 'Sin contenido')}</div>
                <div>
                  <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                    {reminder.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ReminderModal
        open={showReminder}
        onClose={() => setShowReminder(false)}
        client={client}
        appointments={client.appointments}
        communication={communication}
        publicUrl={publicUrl}
      />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  )
}

function formatBirthdate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
