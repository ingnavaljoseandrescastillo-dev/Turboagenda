'use client'

import { useMemo, useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import type { AppointmentWithRelations, CommunicationSettings } from '@/lib/client-management'

type ReminderClient = {
  id: string
  name: string
  email: string
  phone?: string | null
}

interface ReminderModalProps {
  open: boolean
  onClose: () => void
  client: ReminderClient | null
  appointments: AppointmentWithRelations[]
  communication: CommunicationSettings
  publicUrl: string
  onSent?: () => void
}

export function ReminderModal({
  open,
  onClose,
  client,
  appointments,
  communication,
  publicUrl,
  onSent,
}: ReminderModalProps) {
  const selectableAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.status !== 'cancelled'),
    [appointments]
  )
  const defaultAppointment = selectableAppointments[0] ?? null

  if (!client) return null

  return (
    <Dialog open={open} onClose={onClose} title="Invitar a volver a reservar" className="max-w-2xl">
      {open && (
        <ReminderForm
          key={`${client.id}-${defaultAppointment?.id ?? 'empty'}`}
          client={client}
          selectableAppointments={selectableAppointments}
          defaultAppointment={defaultAppointment}
          communication={communication}
          publicUrl={publicUrl}
          onClose={onClose}
          onSent={onSent}
        />
      )}
    </Dialog>
  )
}

function ReminderForm({
  client,
  selectableAppointments,
  defaultAppointment,
  communication,
  publicUrl,
  onClose,
  onSent,
}: {
  client: ReminderClient
  selectableAppointments: AppointmentWithRelations[]
  defaultAppointment: AppointmentWithRelations | null
  communication: CommunicationSettings
  publicUrl: string
  onClose: () => void
  onSent?: () => void
}) {
  const [appointmentId, setAppointmentId] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithRelations | null>(defaultAppointment)
  const [channels, setChannels] = useState({ email: Boolean(client.email), whatsapp: false })
  const [message, setMessage] = useState(() => buildDefaultMessage(client.name, defaultAppointment ?? undefined, publicUrl))
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const whatsappDisabled = !communication.whatsapp_available || !client.phone
  const emailDisabled = !client.email
  const selectedChannels = [
    channels.email && 'email',
    channels.whatsapp && 'whatsapp',
  ].filter((channel): channel is 'email' | 'whatsapp' => Boolean(channel))

  async function sendReminder() {
    if (!client || !selectedAppointment) return
    if (selectedChannels.length === 0) {
      setError('Escolha pelo menos um canal.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/clients/${client.id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
          channels: selectedChannels,
          message,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[Clients] manual reminder failed', json.error ?? json.data)
        throw new Error(json.error ?? json.data?.message ?? 'Nao foi possivel enviar a invitacion.')
      }
      setSuccess(json.data?.message ?? 'Invitacion enviada.')
      setConfirming(false)
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel enviar a invitacion.')
    } finally {
      setSaving(false)
    }
  }

  const currentAppointmentId = appointmentId || defaultAppointment?.id || ''

  return (
    <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-zinc-300">Ultima cita usada como referencia</span>
            <select
              value={currentAppointmentId}
              onChange={(event) => {
                const appointment = selectableAppointments.find((item) => item.id === event.target.value) ?? null
                setAppointmentId(event.target.value)
                setSelectedAppointment(appointment)
                setMessage(buildDefaultMessage(client.name, appointment ?? undefined, publicUrl))
                setConfirming(false)
              }}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {selectableAppointments.length === 0 ? (
                <option value="">Sin citas disponibles</option>
              ) : (
                selectableAppointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {formatDateTime(appointment.start_time)} - {appointment.service?.name ?? 'Servicio'}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="space-y-1.5 text-sm">
            <span className="font-medium text-zinc-300">Canales</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  disabled={emailDisabled}
                  checked={channels.email}
                  onChange={(event) => setChannels((prev) => ({ ...prev, email: event.target.checked }))}
                />
                <span className="text-zinc-200">Email</span>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  disabled={whatsappDisabled}
                  checked={channels.whatsapp}
                  onChange={(event) => setChannels((prev) => ({ ...prev, whatsapp: event.target.checked }))}
                />
                <span className="text-zinc-200">WhatsApp</span>
              </label>
            </div>
            {whatsappDisabled && (
              <p className="text-xs text-zinc-500">WhatsApp requiere Plan Plus, estar activo y tener telefono.</p>
            )}
          </div>
        </div>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-zinc-300">Mensaje editable</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Vista previa</div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{message}</p>
          {selectedAppointment && (
            <div className="mt-3 text-xs text-zinc-500">
              {selectedAppointment.service?.name ?? 'Servicio'} con {selectedAppointment.employee?.name ?? 'Profesional'}
            </div>
          )}
        </div>

        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{success}</div>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cerrar
          </Button>
          {!confirming ? (
            <Button
              type="button"
              disabled={!selectedAppointment || selectedChannels.length === 0}
              onClick={() => setConfirming(true)}
            >
              Revisar envio
            </Button>
          ) : (
            <Button type="button" loading={saving} onClick={sendReminder}>
              Confirmar y enviar
            </Button>
          )}
      </div>
    </div>
  )
}

function buildDefaultMessage(
  clientName: string,
  appointment: AppointmentWithRelations | undefined,
  publicUrl: string
) {
  const when = appointment ? formatDateTime(appointment.start_time) : 'la fecha acordada'
  return `Hola ${clientName}, esperamos que hayas disfrutado tu ultima visita. Cuando quieras volver, puedes reservar nuevamente aqui: ${publicUrl}\n\nReferencia interna: ultima cita ${when}.`
}
