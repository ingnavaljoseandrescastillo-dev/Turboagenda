'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Appointment } from '@/types'

interface CalendarProps {
  appointments?: Appointment[]
  onDayClick?: (date: Date) => void
  selected?: Date
  timeZone?: string
}

export function Calendar({ appointments = [], onDayClick, selected, timeZone = 'Europe/Lisbon' }: CalendarProps) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function hasAppointment(day: Date) {
    const key = format(day, 'yyyy-MM-dd')
    return appointments.some((a) => appointmentDateKey(a.start_time, timeZone) === key)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100 capitalize">
          {format(current, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1))}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1))}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center mb-2">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-xs font-medium text-zinc-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const inMonth = isSameMonth(day, current)
          const today = isToday(day)
          const chosen = selected ? isSameDay(selected, day) : false
          const hasAppt = hasAppointment(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={cn(
                'relative flex flex-col items-center justify-center h-9 w-full rounded-md text-xs transition-colors',
                inMonth ? 'text-zinc-200' : 'text-zinc-600',
                chosen && 'bg-emerald-500 text-zinc-950 font-bold ring-2 ring-emerald-400/30',
                today && !chosen && 'border border-emerald-500 text-emerald-400 font-bold',
                !chosen && inMonth && 'hover:bg-zinc-800',
              )}
            >
              {format(day, 'd')}
              {hasAppt && !chosen && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function appointmentDateKey(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parseISO(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}
