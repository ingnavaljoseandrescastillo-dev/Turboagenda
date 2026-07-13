'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { enUS, es, pt } from 'date-fns/locale'
import { useAvailability } from '@/hooks/useAvailability'
import { DEFAULT_BUSINESS_TIME_ZONE, zonedDateTimeToUtcIso } from '@/lib/utils'

interface DateTimePickerProps {
  businessId: string
  serviceId: string
  employeeId: string
  maxBookingDays?: number
  availableMonths?: string[]
  timeZone?: string
  primaryColor?: string
  onPrimaryColor?: string
  onSelect: (datetime: string) => void
  selected: string | null
  localeCode?: 'pt' | 'en' | 'es'
  labels?: {
    title: string
    subtitle: string
    previousMonth: string
    nextMonth: string
    availableTimes: string
    loading: string
    empty: string
    weekdays: string[]
  }
}

export function DateTimePicker({
  businessId,
  serviceId,
  employeeId,
  maxBookingDays = 30,
  availableMonths = [],
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
  primaryColor = '#10b981',
  onPrimaryColor = '#09090b',
  onSelect,
  selected,
  localeCode = 'pt',
  labels = defaultLabels.pt,
}: DateTimePickerProps) {
  const today = startOfDay(new Date())
  const maxDate = startOfDay(new Date())
  maxDate.setDate(maxDate.getDate() + Math.max(0, maxBookingDays - 1))
  const sortedAvailableMonths = useMemo(
    () => [...availableMonths].filter(isValidMonthKey).sort(),
    [availableMonths]
  )
  const explicitMonthMode = sortedAvailableMonths.length > 0
  const firstAvailableMonth = useMemo(
    () => (explicitMonthMode ? monthKeyToDate(sortedAvailableMonths[0]) : startOfMonth(today)),
    [explicitMonthMode, sortedAvailableMonths, today]
  )
  const lastAvailableMonth = useMemo(
    () =>
      explicitMonthMode
        ? monthKeyToDate(sortedAvailableMonths[sortedAvailableMonths.length - 1])
        : startOfMonth(maxDate),
    [explicitMonthMode, maxDate, sortedAvailableMonths]
  )

  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [visibleMonth, setVisibleMonth] = useState<Date>(explicitMonthMode ? firstAvailableMonth : startOfMonth(today))
  const { slots, loading, error, fetchSlots } = useAvailability()

  useEffect(() => {
    if (!explicitMonthMode) return
    const selectedKey = format(selectedDate, 'yyyy-MM')
    if (sortedAvailableMonths.includes(selectedKey)) return

    const nextDate = isBefore(firstAvailableMonth, today) ? today : firstAvailableMonth
    const timeoutId = window.setTimeout(() => {
      setSelectedDate(nextDate)
      setVisibleMonth(startOfMonth(nextDate))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [explicitMonthMode, firstAvailableMonth, selectedDate, sortedAvailableMonths, today])

  useEffect(() => {
    fetchSlots({
      business_id: businessId,
      service_id: serviceId,
      employee_id: employeeId,
      date: format(selectedDate, 'yyyy-MM-dd'),
    })
  }, [selectedDate, businessId, serviceId, employeeId, fetchSlots])

  const monthStart = startOfMonth(visibleMonth)
  const monthEnd = endOfMonth(visibleMonth)
  const leadingBlanks = Array.from({ length: getDay(monthStart) })
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const previousMonth = startOfMonth(subMonths(visibleMonth, 1))
  const nextMonth = startOfMonth(addMonths(visibleMonth, 1))
  const canGoPrev = explicitMonthMode
    ? !isBefore(previousMonth, firstAvailableMonth)
    : isAfter(monthStart, startOfMonth(today))
  const canGoNext = explicitMonthMode
    ? !isAfter(nextMonth, lastAvailableMonth)
    : isBefore(endOfMonth(addMonths(visibleMonth, 1)), maxDate)
  const dateLocale = localeCode === 'es' ? es : localeCode === 'en' ? enUS : pt

  function slotToIso(time: string) {
    return zonedDateTimeToUtcIso(format(selectedDate, 'yyyy-MM-dd'), time, timeZone)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{labels.title}</h3>
          <p className="text-sm text-zinc-500">{labels.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
            className="h-9 w-9 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 disabled:opacity-40"
            aria-label={labels.previousMonth}
          >
            &lt;
          </button>
          <button
            type="button"
            disabled={!canGoNext}
            onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            className="h-9 w-9 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 disabled:opacity-40"
            aria-label={labels.nextMonth}
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-4 text-center">
          <p className="font-semibold capitalize text-zinc-100">
            {format(visibleMonth, 'MMMM yyyy', { locale: dateLocale })}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-zinc-500">
          {labels.weekdays.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {leadingBlanks.map((_, index) => (
            <div key={`blank-${index}`} className="aspect-square" />
          ))}
          {days.map((day) => {
            const monthAllowed = !explicitMonthMode || sortedAvailableMonths.includes(format(day, 'yyyy-MM'))
            const unavailable = isBefore(day, today) || !monthAllowed || (!explicitMonthMode && isAfter(day, maxDate))
            const isSelected = isSameDay(day, selectedDate)
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={unavailable}
                onClick={() => setSelectedDate(day)}
                className="aspect-square rounded-xl border text-sm font-semibold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  borderColor: isSelected ? primaryColor : '#27272a',
                  backgroundColor: isSelected ? primaryColor : 'rgba(9,9,11,0.7)',
                  color: isSelected ? onPrimaryColor : '#d4d4d8',
                }}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-zinc-400">
          {labels.availableTimes} - {format(selectedDate, "d 'de' MMMM", { locale: dateLocale })}
        </h3>
        {loading ? (
          <p className="text-sm text-zinc-500">{labels.loading}</p>
        ) : error ? (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-3 text-sm text-zinc-500">
            {labels.empty}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((time) => {
              const datetime = slotToIso(time)
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => onSelect(datetime)}
                  className="rounded-lg border px-2 py-2 text-sm font-medium transition-all hover:brightness-110"
                  style={{
                    borderColor: selected === datetime ? primaryColor : '#27272a',
                    backgroundColor: selected === datetime ? primaryColor : '#18181b',
                    color: selected === datetime ? onPrimaryColor : '#d4d4d8',
                  }}
                >
                  {time}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function isValidMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && Number(value.slice(5, 7)) >= 1 && Number(value.slice(5, 7)) <= 12
}

function monthKeyToDate(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

const defaultLabels = {
  pt: {
    title: 'Escolha o dia',
    subtitle: 'Selecione uma data disponivel no calendario.',
    previousMonth: 'Mes anterior',
    nextMonth: 'Proximo mes',
    availableTimes: 'Horarios disponiveis',
    loading: 'A carregar horarios...',
    empty: 'Sem horarios disponiveis para este dia. Escolha outra data no calendario.',
    weekdays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
  },
}
