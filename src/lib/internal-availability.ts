import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeTimeZone, zonedDateTimeToUtcIso } from '@/lib/utils'

type AdminClient = ReturnType<typeof createAdminClient>
type TimeRange = { start: string; end: string }

interface InternalAvailabilityInput {
  businessId: string
  employeeId: string
  serviceIds: string[]
  date: string
}

export async function getInternalAvailableSlots(db: AdminClient, input: InternalAvailabilityInput) {
  const [{ data: settings, error: settingsError }, { data: services, error: servicesError }, { data: employee, error: employeeError }, { data: override, error: overrideError }] = await Promise.all([
    db
      .from('business_settings')
      .select('opening_time, closing_time, slot_duration_minutes, working_days, working_schedule, time_zone')
      .eq('business_id', input.businessId)
      .maybeSingle(),
    db
      .from('services')
      .select('id, duration_minutes')
      .eq('business_id', input.businessId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .in('id', input.serviceIds),
    db
      .from('employees')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('id', input.employeeId)
      .eq('is_active', true)
      .maybeSingle(),
    db
      .from('business_day_overrides')
      .select('is_closed, opening_time, closing_time, time_ranges, slot_duration_minutes')
      .eq('business_id', input.businessId)
      .eq('date', input.date)
      .maybeSingle(),
  ])

  if (settingsError) throw new Error(settingsError.message)
  if (servicesError) throw new Error(servicesError.message)
  if (employeeError) throw new Error(employeeError.message)
  if (overrideError) throw new Error(overrideError.message)
  if (!employee || !services || services.length !== input.serviceIds.length) return []
  if (override?.is_closed) return []

  const durationMinutes = services.reduce((total, service) => total + service.duration_minutes, 0)
  if (durationMinutes <= 0) return []

  const timeZone = normalizeTimeZone(settings?.time_zone)
  const opening = trimTime(override?.opening_time ?? settings?.opening_time ?? '09:00')
  const closing = trimTime(override?.closing_time ?? settings?.closing_time ?? '18:00')
  const slotMinutes = override?.slot_duration_minutes ?? settings?.slot_duration_minutes ?? 30
  const dayOfWeek = localDayOfWeek(input.date)
  const workingDays = settings?.working_days ?? [1, 2, 3, 4, 5]
  if (!override && !workingDays.includes(dayOfWeek)) return []

  const schedule = (settings?.working_schedule ?? {}) as Record<string, TimeRange[]>
  const ranges = normalizeRanges(
    override ? override.time_ranges : schedule[String(dayOfWeek)],
    opening,
    closing
  )
  if (ranges.length === 0) return []

  const candidates = ranges.flatMap((range) => buildCandidates(input.date, range, slotMinutes, durationMinutes, timeZone))
  const futureCandidates = candidates.filter((candidate) => candidate.start.getTime() > Date.now())
  if (futureCandidates.length === 0) return []

  const minStart = futureCandidates.reduce((minimum, candidate) => candidate.start < minimum ? candidate.start : minimum, futureCandidates[0].start)
  const maxEnd = futureCandidates.reduce((maximum, candidate) => candidate.end > maximum ? candidate.end : maximum, futureCandidates[0].end)
  const { data: appointments, error: appointmentsError } = await db
    .from('appointments')
    .select('start_time, end_time')
    .eq('business_id', input.businessId)
    .eq('employee_id', input.employeeId)
    .neq('status', 'cancelled')
    .lt('start_time', maxEnd.toISOString())
    .gt('end_time', minStart.toISOString())

  if (appointmentsError) throw new Error(appointmentsError.message)

  return futureCandidates
    .filter((candidate) => !(appointments ?? []).some((appointment) => {
      const existingStart = new Date(appointment.start_time)
      const existingEnd = new Date(appointment.end_time)
      return existingStart < candidate.end && existingEnd > candidate.start
    }))
    .map((candidate) => candidate.time)
}

function buildCandidates(date: string, range: TimeRange, slotMinutes: number, durationMinutes: number, timeZone: string) {
  const candidates: { time: string; start: Date; end: Date }[] = []
  let current = minutesFromTime(range.start)
  const rangeEnd = minutesFromTime(range.end)

  while (current + durationMinutes <= rangeEnd) {
    const time = timeFromMinutes(current)
    const start = new Date(zonedDateTimeToUtcIso(date, time, timeZone))
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    candidates.push({ time, start, end })
    current += Math.max(5, slotMinutes)
  }

  return candidates
}

function normalizeRanges(value: unknown, fallbackStart: string, fallbackEnd: string): TimeRange[] {
  if (Array.isArray(value)) {
    const ranges = value.filter((range): range is TimeRange => Boolean(
      range && typeof range === 'object' &&
      typeof (range as TimeRange).start === 'string' &&
      typeof (range as TimeRange).end === 'string' &&
      minutesFromTime((range as TimeRange).start) < minutesFromTime((range as TimeRange).end)
    ))
    if (ranges.length > 0) return ranges
  }
  return minutesFromTime(fallbackStart) < minutesFromTime(fallbackEnd)
    ? [{ start: fallbackStart, end: fallbackEnd }]
    : []
}

function trimTime(value: string) {
  return value.slice(0, 5)
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + minutes
}

function timeFromMinutes(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}

function localDayOfWeek(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}
