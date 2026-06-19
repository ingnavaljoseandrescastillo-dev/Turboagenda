'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  addMonths,
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
import type { Appointment, BusinessSettings, BusinessDayOverride, TimeRange } from '@/types'

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
const MAX_MONTH_CHOICES = 12

const TIME_ZONES = [
  { label: 'Portugal continental (Lisboa)', value: 'Europe/Lisbon' },
  { label: 'Azores', value: 'Atlantic/Azores' },
  { label: 'Madeira / Canarias', value: 'Atlantic/Madeira' },
  { label: 'Espana peninsular', value: 'Europe/Madrid' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Venezuela', value: 'America/Caracas' },
]

interface AgendaManagerProps {
  appointments: Appointment[]
  settings: BusinessSettings | null
  closedDays: BusinessDayOverride[]
}

type ScheduleState = {
  opening_time: string
  closing_time: string
  slot_duration_minutes: number
  working_days: number[]
  available_months: string[]
  working_schedule: Record<string, TimeRange[]>
  time_zone: string
}

type DayScheduleState = {
  time_ranges: TimeRange[]
  slot_duration_minutes: number
}

export function AgendaManager({ appointments, settings, closedDays }: AgendaManagerProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [dayOverrides, setDayOverrides] = useState(() => new Map(closedDays.map((day) => [day.date, day])))
  const [savingDay, setSavingDay] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)
  const [daySuccess, setDaySuccess] = useState<string | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const monthChoices = useMemo(() => buildMonthChoices(), [])
  const [schedule, setSchedule] = useState<ScheduleState>(() => createScheduleState(settings))
  const [daySchedule, setDaySchedule] = useState<DayScheduleState>(() => createDaySchedule(null, createScheduleState(settings)))

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedOverride = dayOverrides.get(selectedDateKey)
  const selectedIsClosed = Boolean(selectedOverride?.is_closed)
  const selectedRanges = selectedOverride && !selectedOverride.is_closed
    ? normalizeRanges(selectedOverride.time_ranges ?? [], selectedOverride.opening_time ?? schedule.opening_time, selectedOverride.closing_time ?? schedule.closing_time)
    : getRangesForDay(schedule, selectedDate.getDay())
  const selectedHasSpecialSchedule = Boolean(selectedOverride && !selectedOverride.is_closed && hasOverrideSchedule(selectedOverride))
  const closedDates = useMemo(
    () => new Set([...dayOverrides.values()].filter((day) => day.is_closed).map((day) => day.date)),
    [dayOverrides]
  )
  const specialScheduleDates = useMemo(
    () =>
      new Set(
        [...dayOverrides.values()]
          .filter((day) => !day.is_closed && hasOverrideSchedule(day))
          .map((day) => day.date)
      ),
    [dayOverrides]
  )
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

        setDayOverrides((current) => {
          const next = new Map(current)
          for (const item of (json.data ?? []) as BusinessDayOverride[]) {
            next.set(item.date, item)
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

  function toggleAvailableMonth(monthKey: string) {
    setSchedule((current) => {
      const hasMonth = current.available_months.includes(monthKey)
      const available_months = hasMonth
        ? current.available_months.filter((month) => month !== monthKey)
        : [...current.available_months, monthKey].sort()
      return { ...current, available_months }
    })
  }

  function toggleWorkingDay(day: number) {
    setSchedule((current) => {
      const isActive = current.working_days.includes(day)
      const working_days = isActive
        ? current.working_days.filter((d) => d !== day)
        : [...current.working_days, day].sort()
      const working_schedule = { ...current.working_schedule }

      if (isActive) {
        delete working_schedule[String(day)]
      } else {
        working_schedule[String(day)] = [{ start: current.opening_time, end: current.closing_time }]
      }

      return { ...current, working_days, working_schedule }
    })
  }

  function updateDayRange(day: number, index: number, field: keyof TimeRange, value: string) {
    setSchedule((current) => {
      const key = String(day)
      const ranges = normalizeRanges(current.working_schedule[key] ?? [], current.opening_time, current.closing_time)
      ranges[index] = { ...ranges[index], [field]: value }
      return {
        ...current,
        working_schedule: { ...current.working_schedule, [key]: ranges },
      }
    })
  }

  function addDayRange(day: number) {
    setSchedule((current) => {
      const key = String(day)
      const ranges = normalizeRanges(current.working_schedule[key] ?? [], current.opening_time, current.closing_time)
      if (ranges.length >= 2) return current
      return {
        ...current,
        working_schedule: { ...current.working_schedule, [key]: [...ranges, { start: '13:30', end: current.closing_time }] },
      }
    })
  }

  function removeDayRange(day: number, index: number) {
    setSchedule((current) => {
      const key = String(day)
      const ranges = normalizeRanges(current.working_schedule[key] ?? [], current.opening_time, current.closing_time)
      if (ranges.length <= 1) return current
      return {
        ...current,
        working_schedule: { ...current.working_schedule, [key]: ranges.filter((_, rangeIndex) => rangeIndex !== index) },
      }
    })
  }

  function updateSpecialRange(index: number, field: keyof TimeRange, value: string) {
    setDaySchedule((current) => {
      const ranges = [...current.time_ranges]
      ranges[index] = { ...ranges[index], [field]: value }
      return { ...current, time_ranges: ranges }
    })
  }

  function addSpecialRange() {
    setDaySchedule((current) => {
      if (current.time_ranges.length >= 2) return current
      const last = current.time_ranges[current.time_ranges.length - 1]
      return { ...current, time_ranges: [...current.time_ranges, { start: '13:30', end: last?.end ?? schedule.closing_time }] }
    })
  }

  function removeSpecialRange(index: number) {
    setDaySchedule((current) => {
      if (current.time_ranges.length <= 1) return current
      return { ...current, time_ranges: current.time_ranges.filter((_, rangeIndex) => rangeIndex !== index) }
    })
  }

  function selectDate(date: Date) {
    const key = format(date, 'yyyy-MM-dd')
    setSelectedDate(date)
    setDaySchedule(createDaySchedule(dayOverrides.get(key) ?? null, schedule, date))
    setDayError(null)
    setDaySuccess(null)
  }

  async function handleScheduleSave(e: FormEvent) {
    e.preventDefault()
    setSavingSchedule(true)
    setScheduleSuccess(false)
    setScheduleError(null)
    try {
      const normalized = normalizeSchedule(schedule)
      const primaryRange = getPrimaryRange(normalized)
      const res = await fetch('/api/business-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_time: primaryRange.start,
          closing_time: primaryRange.end,
          slot_duration_minutes: normalized.slot_duration_minutes,
          working_days: normalized.working_days,
          max_booking_days: Math.max(1, normalized.available_months.length) * 31,
          available_months: normalized.available_months,
          working_schedule: normalized.working_schedule,
          time_zone: normalized.time_zone,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[AgendaManager] schedule save failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar o horario.')
      }
      setSchedule(normalized)
      setScheduleSuccess(true)
      if (!selectedOverride) setDaySchedule(createDaySchedule(null, normalized, selectedDate))
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
    setDaySuccess(null)
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

      setDayOverrides((current) => {
        const next = new Map(current)
        if (nextClosed) next.set(selectedDateKey, json.data as BusinessDayOverride)
        else next.delete(selectedDateKey)
        return next
      })
      if (!nextClosed) setDaySchedule(createDaySchedule(null, schedule, selectedDate))
      setDaySuccess(nextClosed ? 'Dia desativado para reservas.' : 'Dia ativado con horario general.')
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o dia.')
    } finally {
      setSavingDay(false)
    }
  }

  async function handleDayScheduleSave(e: FormEvent) {
    e.preventDefault()
    setSavingDay(true)
    setDayError(null)
    setDaySuccess(null)
    try {
      const timeRanges = normalizeRanges(daySchedule.time_ranges, schedule.opening_time, schedule.closing_time)
      const lastRange = timeRanges[timeRanges.length - 1]
      const res = await fetch('/api/business-day-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateKey,
          is_closed: false,
          opening_time: timeRanges[0]?.start,
          closing_time: lastRange?.end,
          time_ranges: timeRanges,
          slot_duration_minutes: daySchedule.slot_duration_minutes,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[AgendaManager] special schedule failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel guardar o horario especial.')
      }

      setDaySchedule((current) => ({ ...current, time_ranges: timeRanges }))
      setDayOverrides((current) => {
        const next = new Map(current)
        next.set(selectedDateKey, json.data as BusinessDayOverride)
        return next
      })
      setDaySuccess('Horario especial guardado para este dia.')
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Nao foi possivel guardar o horario especial.')
    } finally {
      setSavingDay(false)
    }
  }

  async function clearSelectedDaySchedule() {
    setSavingDay(true)
    setDayError(null)
    setDaySuccess(null)
    try {
      const res = await fetch('/api/business-day-overrides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateKey, is_closed: false }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[AgendaManager] clear day schedule failed', json.error)
        throw new Error(json.error ?? 'Nao foi possivel remover o horario especial.')
      }

      setDayOverrides((current) => {
        const next = new Map(current)
        next.delete(selectedDateKey)
        return next
      })
      setDaySchedule(createDaySchedule(null, schedule, selectedDate))
      setDaySuccess('Este dia voltou a usar o horario general.')
    } catch (err) {
      setDayError(err instanceof Error ? err.message : 'Nao foi possivel remover o horario especial.')
    } finally {
      setSavingDay(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-5">
        <Card>
          <form onSubmit={handleScheduleSave} className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Horario e reservas</h3>
              <p className="mt-1 text-sm text-zinc-500">Controla quando los clientes pueden agendar.</p>
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
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-zinc-300">Zona horaria</span>
                <select
                  value={schedule.time_zone}
                  onChange={(event) => setSchedule((s) => ({ ...s, time_zone: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                >
                  {TIME_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-zinc-500">
                  Los correos y reservas publicas usaran esta zona horaria.
                </span>
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">Meses abiertos para reservas</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {monthChoices.map((month) => {
                  const selected = schedule.available_months.includes(month.key)
                  return (
                    <button
                      key={month.key}
                      type="button"
                      onClick={() => toggleAvailableMonth(month.key)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="block capitalize">{month.label}</span>
                      <span className={selected ? 'text-xs text-emerald-50' : 'text-xs text-zinc-600'}>
                        {selected ? 'Abierto' : 'Bloqueado'}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Puedes abrir meses salteados, por ejemplo enero, febrero y abril.
              </p>
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

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-zinc-300">Horarios por dia</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Usa una segunda franja para pausa de almuerzo o descanso.
                </p>
              </div>
              {schedule.working_days.map((day) => {
                const ranges = getRangesForDay(schedule, day)
                return (
                  <div key={day} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-zinc-100">{WORK_DAYS.find((item) => item.value === day)?.label}</p>
                      <button
                        type="button"
                        onClick={() => addDayRange(day)}
                        disabled={ranges.length >= 2}
                        className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300 disabled:opacity-40"
                      >
                        + Franja
                      </button>
                    </div>
                    <div className="space-y-2">
                      {ranges.map((range, index) => (
                        <div key={`${day}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            label={`Inicio ${index + 1}`}
                            type="time"
                            value={range.start}
                            onChange={(event) => updateDayRange(day, index, 'start', event.target.value)}
                          />
                          <Input
                            label={`Fin ${index + 1}`}
                            type="time"
                            value={range.end}
                            onChange={(event) => updateDayRange(day, index, 'end', event.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeDayRange(day, index)}
                            disabled={ranges.length <= 1}
                            className="self-end rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
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
          specialScheduleDates={specialScheduleDates}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onMonthChange={setVisibleMonth}
          onSelectDate={selectDate}
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
              <p className="mt-1 text-xs text-zinc-600">
                {selectedHasSpecialSchedule
                  ? `Horario especial: ${rangesSummary(selectedRanges)}`
                  : `Horario general: ${rangesSummary(selectedRanges)}`}
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

          <form onSubmit={handleDayScheduleSave} className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">Horario especial del dia</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Ajusta solo esta fecha sin cambiar el horario general del negocio.
              </p>
            </div>

            {daySchedule.time_ranges.map((range, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  label={`Abertura ${index + 1}`}
                  type="time"
                  disabled={selectedIsClosed}
                  value={range.start}
                  onChange={(event) => updateSpecialRange(index, 'start', event.target.value)}
                />
                <Input
                  label={`Fecho ${index + 1}`}
                  type="time"
                  disabled={selectedIsClosed}
                  value={range.end}
                  onChange={(event) => updateSpecialRange(index, 'end', event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSpecialRange(index)}
                  disabled={selectedIsClosed || daySchedule.time_ranges.length <= 1}
                  className="self-end rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addSpecialRange}
                disabled={selectedIsClosed || daySchedule.time_ranges.length >= 2}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-40"
              >
                + Agregar franja
              </button>
            </div>

            <Input
              label="Duracao do slot (min)"
              type="number"
              min={5}
              max={240}
              disabled={selectedIsClosed}
              value={daySchedule.slot_duration_minutes}
              onChange={(e) =>
                setDaySchedule((current) => ({ ...current, slot_duration_minutes: Number(e.target.value) || 30 }))
              }
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={savingDay} disabled={selectedIsClosed}>
                Guardar horario especial
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={savingDay}
                disabled={!selectedHasSpecialSchedule}
                onClick={clearSelectedDaySchedule}
              >
                Usar horario general
              </Button>
            </div>

            {selectedIsClosed && (
              <p className="text-xs text-zinc-500">Activa el dia antes de guardar un horario especial.</p>
            )}
          </form>

          {daySuccess && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {daySuccess}
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
  specialScheduleDates,
  selectedDate,
  visibleMonth,
  onMonthChange,
  onSelectDate,
}: {
  appointments: Appointment[]
  closedDates: Set<string>
  specialScheduleDates: Set<string>
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
            const special = specialScheduleDates.has(key)
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
                  {special && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                      Hora
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

function createScheduleState(settings: BusinessSettings | null): ScheduleState {
  const opening_time = String(settings?.opening_time ?? '09:00').slice(0, 5)
  const closing_time = String(settings?.closing_time ?? '18:00').slice(0, 5)
  const working_days = settings?.working_days?.length ? settings.working_days : [1, 2, 3, 4, 5]
  const working_schedule = createWorkingSchedule(settings, working_days, opening_time, closing_time)

  return {
    opening_time,
    closing_time,
    slot_duration_minutes: settings?.slot_duration_minutes ?? 30,
    working_days,
    available_months: createAvailableMonths(settings),
    working_schedule,
    time_zone: settings?.time_zone ?? 'Europe/Lisbon',
  }
}

function createDaySchedule(override: BusinessDayOverride | null, schedule: ScheduleState, date = new Date()): DayScheduleState {
  const day = new Date(`${override?.date ?? format(date, 'yyyy-MM-dd')}T00:00:00`).getDay()
  const fallbackRanges = getRangesForDay(schedule, day)
  const fallbackStart = fallbackRanges[0]?.start ?? schedule.opening_time
  const fallbackEnd = fallbackRanges[fallbackRanges.length - 1]?.end ?? schedule.closing_time

  return {
    time_ranges: normalizeRanges(override?.time_ranges ?? [], override?.opening_time ?? fallbackStart, override?.closing_time ?? fallbackEnd),
    slot_duration_minutes: override?.slot_duration_minutes ?? schedule.slot_duration_minutes,
  }
}

function createWorkingSchedule(
  settings: BusinessSettings | null,
  workingDays: number[],
  openingTime: string,
  closingTime: string
) {
  const existing = settings?.working_schedule ?? {}
  const schedule: Record<string, TimeRange[]> = {}

  for (const day of workingDays) {
    const key = String(day)
    schedule[key] = normalizeRanges(existing[key] ?? [], openingTime, closingTime)
  }

  return schedule
}

function createAvailableMonths(settings: BusinessSettings | null) {
  if (settings?.available_months?.length) return [...settings.available_months].filter(isMonthKey).sort()

  const monthsToOpen = Math.max(1, Math.ceil((settings?.max_booking_days ?? 30) / 30))
  return buildMonthChoices()
    .slice(0, monthsToOpen)
    .map((month) => month.key)
}

function buildMonthChoices() {
  const start = startOfMonth(new Date())
  return Array.from({ length: MAX_MONTH_CHOICES }, (_, index) => {
    const date = addMonths(start, index)
    return {
      key: format(date, 'yyyy-MM'),
      label: format(date, 'MMM yyyy', { locale: ptBR }),
    }
  })
}

function normalizeSchedule(schedule: ScheduleState): ScheduleState {
  const working_schedule: Record<string, TimeRange[]> = {}
  for (const day of schedule.working_days) {
    working_schedule[String(day)] = normalizeRanges(
      schedule.working_schedule[String(day)] ?? [],
      schedule.opening_time,
      schedule.closing_time
    )
  }

  const primaryRange = getPrimaryRange({ ...schedule, working_schedule })

  return {
    ...schedule,
    opening_time: primaryRange.start,
    closing_time: primaryRange.end,
    available_months: schedule.available_months.filter(isMonthKey).sort(),
    working_schedule,
  }
}

function getRangesForDay(schedule: ScheduleState, day: number) {
  return normalizeRanges(schedule.working_schedule[String(day)] ?? [], schedule.opening_time, schedule.closing_time)
}

function normalizeRanges(ranges: TimeRange[], fallbackStart: string, fallbackEnd: string) {
  const clean = ranges
    .map((range) => ({ start: String(range.start ?? '').slice(0, 5), end: String(range.end ?? '').slice(0, 5) }))
    .filter((range) => isTime(range.start) && isTime(range.end) && range.start < range.end)
    .slice(0, 2)

  if (clean.length) return clean
  return [{ start: String(fallbackStart).slice(0, 5), end: String(fallbackEnd).slice(0, 5) }]
}

function getPrimaryRange(schedule: ScheduleState) {
  const firstDay = schedule.working_days[0] ?? 1
  const ranges = getRangesForDay(schedule, firstDay)
  return {
    start: ranges[0]?.start ?? schedule.opening_time,
    end: ranges[ranges.length - 1]?.end ?? schedule.closing_time,
  }
}

function rangesSummary(ranges: TimeRange[]) {
  return ranges.map((range) => `${range.start} - ${range.end}`).join(' / ')
}

function hasOverrideSchedule(day: BusinessDayOverride) {
  return Boolean(
    day.time_ranges?.length ||
      (day.opening_time && day.closing_time)
  )
}

function isTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value)
}

function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && Number(value.slice(5, 7)) >= 1 && Number(value.slice(5, 7)) <= 12
}
