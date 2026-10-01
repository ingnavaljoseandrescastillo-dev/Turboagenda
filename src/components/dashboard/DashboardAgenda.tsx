'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isToday, parse } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { Calendar } from '@/components/dashboard/Calendar'
import { Dialog } from '@/components/ui/Dialog'
import { useAvailability } from '@/hooks/useAvailability'
import { formatTimeInTimeZone, zonedDateTimeToUtcIso } from '@/lib/utils'
import type { Appointment } from '@/types'

type ServiceOption = { id: string; name: string; duration_minutes: number; price: number }
type EmployeeOption = { id: string; name: string }
type ClientOption = { id: string; name: string; email: string; phone?: string | null; birthdate?: string | null }

interface DashboardAgendaProps {
  businessId: string
  appointments: Appointment[]
  services: ServiceOption[]
  employees: EmployeeOption[]
  clients: ClientOption[]
  timeZone: string
}

export function DashboardAgenda(props: DashboardAgendaProps) {
  const router = useRouter()
  const [appointments, setAppointments] = useState(props.appointments)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [open, setOpen] = useState(false)
  const selectedKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedAppointments = useMemo(
    () => appointments.filter((appointment) => appointmentDateKey(appointment.start_time, props.timeZone) === selectedKey),
    [appointments, props.timeZone, selectedKey]
  )
  const title = isToday(selectedDate)
    ? 'Marcações de hoje'
    : `Marcações de ${format(selectedDate, "d 'de' MMMM", { locale: pt })}`

  function openBooking() {
    setOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold capitalize">{title}</h3>
                <span className="text-xs text-zinc-500">{selectedAppointments.length} total</span>
              </div>
              <button
                type="button"
                onClick={openBooking}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
                aria-label="Criar marcação interna"
              >
                <span className="text-xl leading-none">+</span>
                <span className="hidden sm:inline">Nova marcação</span>
              </button>
            </div>
            {selectedAppointments.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mb-3 text-3xl">📅</div>
                <p className="text-sm text-zinc-500">Sem marcações para este dia</p>
                <button type="button" onClick={openBooking} className="mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300">
                  Criar a primeira marcação
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {selectedAppointments.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} showActions />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="mb-4 text-xs text-zinc-500">Selecione um dia para ver ou criar marcações.</p>
          <Calendar appointments={appointments} selected={selectedDate} onDayClick={setSelectedDate} timeZone={props.timeZone} />
        </div>
      </div>

      <InternalAppointmentDialog
        key={open ? selectedKey : 'closed'}
        {...props}
        selectedDate={selectedDate}
        open={open}
        onClose={() => setOpen(false)}
        onCreated={(appointment) => {
          setAppointments((current) => [...current, appointment].sort((a, b) => a.start_time.localeCompare(b.start_time)))
          setSelectedDate(parse(appointmentDateKey(appointment.start_time, props.timeZone), 'yyyy-MM-dd', new Date()))
          setOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}

function InternalAppointmentDialog({
  businessId,
  services,
  employees,
  clients,
  timeZone,
  selectedDate,
  open,
  onClose,
  onCreated,
}: Omit<DashboardAgendaProps, 'appointments'> & {
  selectedDate: Date
  open: boolean
  onClose: () => void
  onCreated: (appointment: Appointment) => void
}) {
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { slots, loading: slotsLoading, error: slotsError, fetchSlots } = useAvailability()

  useEffect(() => {
    if (!open || serviceIds.length === 0 || !employeeId || !date) return
    fetchSlots({
      business_id: businessId,
      service_id: serviceIds[0],
      service_ids: serviceIds.join(','),
      employee_id: employeeId,
      date,
    })
  }, [businessId, date, employeeId, fetchSlots, open, serviceIds])

  function selectClient(id: string) {
    setClientId(id)
    const client = clients.find((item) => item.id === id)
    if (!client) return
    setName(client.name)
    setEmail(client.email)
    setPhone(client.phone ?? '')
    setBirthdate(client.birthdate ?? '')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (serviceIds.length === 0 || !employeeId || !startTime) {
      setError('Escolha serviço, profissional e horário.')
      return
    }
    if (!email.trim() && !phone.trim()) {
      setError('Informe o telefone ou o email do cliente.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/appointments/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceIds[0],
          service_ids: serviceIds,
          employee_id: employeeId,
          client_name: name,
          client_email: email,
          client_phone: phone,
          client_birthdate: birthdate,
          start_time: startTime,
          notes,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Não foi possível criar a marcação.')
      onCreated(json.data as Appointment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a marcação.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nova marcação interna" className="max-h-[92vh] max-w-2xl overflow-y-auto">
      <form onSubmit={submit} className="space-y-5">
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Esta marcação ficará confirmada automaticamente.
        </p>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-300">Serviços</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((service) => (
              <label key={service.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-700">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(service.id)}
                  onChange={(event) => {
                    setStartTime(null)
                    setServiceIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))
                  }}
                  className="mt-1 accent-emerald-500"
                />
                <span>
                  <span className="block text-sm font-medium text-zinc-100">{service.name}</span>
                  <span className="text-xs text-zinc-500">{service.duration_minutes} min · {service.price.toFixed(2)} €</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profissional">
            <select required value={employeeId} onChange={(event) => { setStartTime(null); setEmployeeId(event.target.value) }} className={inputClass}>
              <option value="">Selecionar</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </Field>
          <Field label="Data">
            <input required type="date" min={format(new Date(), 'yyyy-MM-dd')} value={date} onChange={(event) => { setStartTime(null); setDate(event.target.value) }} className={inputClass} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Horário disponível</p>
          {serviceIds.length === 0 || !employeeId ? (
            <p className="text-sm text-zinc-500">Escolha primeiro o serviço e o profissional.</p>
          ) : slotsLoading ? (
            <p className="text-sm text-zinc-500">A carregar horários...</p>
          ) : slotsError ? (
            <p className="text-sm text-red-400">{slotsError}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem horários disponíveis neste dia.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((slot) => {
                const iso = zonedDateTimeToUtcIso(date, slot, timeZone)
                return (
                  <button key={slot} type="button" onClick={() => setStartTime(iso)} className={`rounded-lg border px-2 py-2 text-sm ${startTime === iso ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'}`}>
                    {slot}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {clients.length > 0 && (
          <Field label="Cliente guardado (opcional)">
            <select value={clientId} onChange={(event) => selectClient(event.target.value)} className={inputClass}>
              <option value="">Introduzir novo cliente</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.email || client.phone || 'Sem contacto'}</option>)}
            </select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome do cliente"><input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></Field>
          <Field label="Email (opcional)"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></Field>
          <Field label="Telefone (obrigatório se não indicar email)"><input value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></Field>
          <Field label="Data de nascimento (opcional)"><input type="date" value={birthdate} onChange={(event) => setBirthdate(event.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Notas (opcional)"><textarea rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>

        {startTime && <p className="text-sm text-zinc-400">Início selecionado: <strong className="text-zinc-100">{formatTimeInTimeZone(startTime, timeZone)}</strong></p>}
        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">Cancelar</button>
          <button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? 'A guardar...' : 'Confirmar marcação'}</button>
        </div>
      </form>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-zinc-300">{label}</span>{children}</label>
}

const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500'

function appointmentDateKey(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
