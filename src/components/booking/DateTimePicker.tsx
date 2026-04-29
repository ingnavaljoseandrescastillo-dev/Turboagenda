'use client'

import { useState, useEffect } from 'react'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAvailability } from '@/hooks/useAvailability'

interface DateTimePickerProps {
  businessId: string
  serviceId: string
  employeeId: string
  maxBookingDays?: number
  onSelect: (datetime: string) => void
  selected: string | null
}

export function DateTimePicker({
  businessId,
  serviceId,
  employeeId,
  maxBookingDays = 30,
  onSelect,
  selected,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const { slots, loading, fetchSlots } = useAvailability()

  useEffect(() => {
    fetchSlots({
      business_id: businessId,
      service_id: serviceId,
      employee_id: employeeId,
      date: format(selectedDate, 'yyyy-MM-dd'),
    })
  }, [selectedDate, businessId, serviceId, employeeId, fetchSlots])

  const days = Array.from({ length: Math.max(1, Math.min(maxBookingDays, 365)) }, (_, i) => addDays(new Date(), i))

  function handleSlot(time: string) {
    const datetime = `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`
    onSelect(datetime)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-100">Escolha o dia</h3>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => {
          const past = isBefore(day, startOfDay(new Date()))
          const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={past}
              onClick={() => setSelectedDate(day)}
              className={`flex flex-col items-center rounded-xl border px-3 py-2 min-w-[60px] flex-shrink-0 transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-zinc-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <span className="text-xs capitalize">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="text-lg font-bold">{format(day, 'd')}</span>
            </button>
          )
        })}
      </div>

      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Horários disponíveis — {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
        </h3>
        {loading ? (
          <p className="text-sm text-zinc-500">A carregar horários...</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-zinc-500">Sem horários disponíveis para este dia</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {slots.map((time) => {
              const datetime = `${format(selectedDate, 'yyyy-MM-dd')}T${time}:00`
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleSlot(time)}
                  className={`rounded-lg border px-2 py-2 text-sm font-medium transition-all ${
                    selected === datetime
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-zinc-800 bg-zinc-900 hover:border-emerald-500/50 text-zinc-300'
                  }`}
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
