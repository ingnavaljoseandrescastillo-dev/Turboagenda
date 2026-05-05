'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AppointmentCard } from '@/components/dashboard/AppointmentCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { Appointment, BusinessSettings, BusinessDayOverride } from '@/types'

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const WORK_DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sab', value: 6 },
]

interface AgendaManagerProps {
  appointments: Appointment[]
  settings: BusinessSettings | null
  closedDays: BusinessDayOverride[]
}

export function AgendaManager({ appointments, settings, closedDays }: AgendaManagerProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [closedDates, setClosedDates] = useState(() => new Set(closedDays.filter((d) => d.is_closed).map((d) => d.date)))
  const [savingDay, setSavingDay] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [schedule, setSchedule] = useState({
    opening_time: String(settings?.opening_time ?? '09:00').slice(0, 5),
    closing_time: String(settings?.closing_time ?? '18:00').slice(0, 5),
    slot_duration_minutes: settings?.slot_duration_minutes ?? 30,
    working_days: settings?.working_days ?? [1, 2, 3, 4, 5],
    max_booking_months: Math.max(1, Math.ceil((settings?.max_booking_days ?? 30) / 30)),
  })

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedIsClosed = closedDates.has(selectedDateKey)
  const selectedAppointments = useMemo(
    () => appointments.filter((appointment) => isSameDay(parseISO(appointment.start_time), selectedDate)),
    [appointments, selectedDate]
  )
  const monthAppointments = useMemo(
    () => appointments.filter((appointment) => isSameMonth(parseISO(appointment.start_time), visibleMonth)),
    [appointments, visibleMonth]
  )

  useEffect(() => {
    let active = true

    async function loadMonthOverrides() {
      try {
        const res = await fetch(`/api/business-day-overrides?month=${format(visibleMonth, 'yyyy-MM')}`)
        const json = await res.json()
        if (!res.ok) {
          console.error('[AgendaManager] month override load failed', json.error)
          return
        }

        if (!active) return

        setClosedDates((current) => {
          const next = new Set(current)
          for (const item of (json.data ?? []) as BusinessDayOverride[]) {
            if (item.is_closed) next.add(item.date)
            else next.delete(item.date)
          }
          return next
        })
      } catch (err) {
        console.error('[AgendaManager] month override load failed', err)
      }
    }

    void loadMonthOverrides()

    return () => {
      active = false
    }
  }, [visibleMonth])

  function toggleWorkingDay(day: number) {
    setSchedule((current) => ({
      ...current,
      working_days: current.working_days.includes(day)
        ? current.working_days.filter((d) => d !== day)
        : [...current.working_days, day].sort(),
    }))
  }

  async function handleScheduleSave(e: FormEvent) {
    e.preventDefault()
    setSavingSchedule(true)
    setScheduleSuccess(false)
    setScheduleError(null)
    try {
      const res = await fetch('/api/business-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_time: schedule.opening_time,
          closing_time: schedule.closing_time,
          slot_duration_minutes: schedule.slot_duration_minutes,
          working_days: schedule.working_days,
          max_booking_days: schedule.max_booking_months * 30,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[AgendaManager] schedule save failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar o horario.')
      }
      setScheduleSuccess(true)
      setTimeout(() => setScheduleSuccess(false), 3000)
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Nao foi possivel guardar o horario.')
    } finally {
      setSavingSchedule(false)
    }
  }

  async function toggleSelectedDay() {
    setSavingDay(true)
    setDayError(null)
    try {
      const nextClosed = !selectedIsClosed
      const res = await fetch('/api/business-day-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateKey, is_closed: nextClosed }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[AgendaManager] day override failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel atualizar o dia.')
      }

      setClosedDates((current) => {
        const next = new Set(current)
        if (nextClosed) next.add(selectedDateKey)
        else next.delete(selectedDateKey)
        return next
      })
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o dia.')
    } finally {
      setSavingDay(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
        <Card>
          <form onSubmit={handleScheduleSave} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Horario e reservas</h3>
              <p className="mt-1 text-sm text-zinc-500">Controla quando los clientes pueden agendar.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Abertura"
                type="time"
                value={schedule.opening_time}
                onChange={(e) => setSchedule((s) => ({ ...s, opening_time: e.target.value }))}
              />
              <Input
                label="Fecho"
                type="time"
                value={schedule.closing_time}
                onChange={(e) => setSchedule((s) => ({ ...s, closing_time: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Duracao do slot (min)"
                type="number"
                min={5}
                max={240}
                value={schedule.slot_duration_minutes}
                onChange={(e) =>
                  setSchedule((s) => ({ ...s, slot_duration_minutes: Number(e.target.value) || 30 }))
                }
              />
              <Input
                label="Meses abertos"
                type="number"
                min={1}
                max={12}
                helper={`${schedule.max_booking_months * 30} dias disponibles para reserva`}
                value={schedule.max_booking_months}
                onChange={(e) =>
                  setSchedule((s) => ({ ...s, max_booking_months: Number(e.target.value) || 1 }))
                }
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">Dias de trabalho</p>
              <div className="flex flex-wrap gap-2">
                {WORK_DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWorkingDay(day.value)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      schedule.working_days.includes(day.value)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleSuccess && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                Horario guardado.
              </p>
            )}

            {scheduleError && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {scheduleError}
              </p>
            )}

            <Button type="submit" loading={savingSchedule}>
              Guardar horario
            </Button>
          </form>
        </Card>

        <AgendaCalendar
          appointments={monthAppointments}
          closedDates={closedDates}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelectDate={setSelectedDate}
        />
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                {formatDate(selectedDate.toISOString())}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedAppointments.length} citas para este dia.
              </p>
            </div>
            <Button
              type="button"
              variant={selectedIsClosed ? 'secondary' : 'danger'}
              loading={savingDay}
              onClick={toggleSelectedDay}
            >
              {selectedIsClosed ? 'Activar dia' : 'Desactivar dia'}
            </Button>
          </div>

          {selectedIsClosed && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Este dia esta cerrado para nuevas reservas publicas.
            </p>
          )}

          {dayError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {dayError}
            </p>
          )}

          {selectedAppointments.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <p className="text-sm text-zinc-500">No hay citas para este dia.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800">
              {selectedAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} showActions />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function AgendaCalendar({
  appointments,
  closedDates,
  selectedDate,
  visibleMonth,
  onMonthChange,
  onSelectDate,
}: {
  appointments: Appointment[]
  closedDates: Set<string>
  selectedDate: Date
  visibleMonth: Date
  onMonthChange: (date: Date) => void
  onSelectDate: (date: Date) => void
}) {
  const monthStart = startOfMonth(visibleMonth)
  const monthEnd = endOfMonth(visibleMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function appointmentCount(day: Date) {
    return appointments.filter((appointment) => isSameDay(parseISO(appointment.start_time), day)).length
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Calendario</h3>
            <p className="mt-1 text-sm text-zinc-500">Selecciona un dia para ver citas o cerrarlo.</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1))}
              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Mes anterior"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1))}
              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="Mes siguiente"
            >
              &gt;
            </button>
          </div>
        </div>

        <p className="text-center text-sm font-semibold capitalize text-zinc-100">
          {format(visibleMonth, 'MMMM yyyy', { locale: ptBR })}
        </p>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS.map((day) => (
            <div key={day} className="py-1 text-xs font-medium text-zinc-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const count = appointmentCount(day)
            const inMonth = isSameMonth(day, visibleMonth)
            const selected = isSameDay(day, selectedDate)
            const closed = closedDates.has(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(day)}
                className={`min-h-16 rounded-xl border p-1.5 text-left transition-all ${
                  selected
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : closed
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                } ${inMonth ? 'text-zinc-100' : 'text-zinc-600'}`}
              >
                <span className={`text-sm font-semibold ${isToday(day) ? 'text-emerald-300' : ''}`}>
                  {format(day, 'd')}
                </span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {count > 0 && (
                    <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                      {count}
                    </span>
                  )}
                  {closed && (
                    <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                      Off
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
