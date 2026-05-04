'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { EmployeeSelector } from '@/components/booking/EmployeeSelector'
import { DateTimePicker } from '@/components/booking/DateTimePicker'
import { BookingForm } from '@/components/booking/BookingForm'
import { Button } from '@/components/ui/Button'
import type { Business, BusinessSettings, Employee, Service } from '@/types'

const STEPS = ['Servico', 'Profissional', 'Data e hora', 'Dados']

interface BookClientProps {
  slug: string
  business: Business
  settings: BusinessSettings | null
  services: Service[]
  employees: Employee[]
  initialService: string | null
}

export function BookClient({
  slug,
  business,
  settings,
  services,
  employees,
  initialService,
}: BookClientProps) {
  const router = useRouter()
  const theme = publicTheme(business)
  const [step, setStep] = useState(initialService ? 1 : 0)
  const [completed, setCompleted] = useState(false)
  const [selectedService, setSelectedService] = useState<string | null>(initialService)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [selectedDatetime, setSelectedDatetime] = useState<string | null>(null)

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4" style={{ ...pageBackground(theme), color: theme.text }}>
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10">
            <svg className="h-8 w-8" style={{ color: theme.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Agendamento confirmado!</h2>
          <p className="text-zinc-500">Recebera a confirmacao em breve.</p>
          <Button onClick={() => router.push(`/b/${slug}`)} variant="secondary">
            Voltar ao perfil
          </Button>
        </div>
      </div>
    )
  }

  function canAdvance() {
    if (step === 0) return !!selectedService
    if (step === 1) return !!selectedEmployee
    if (step === 2) return !!selectedDatetime
    return false
  }

  return (
    <div className="min-h-screen" style={{ ...pageBackground(theme), color: theme.text }}>
      <div className="border-b border-white/10 bg-black/25 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>Reserva online</p>
          <h1 className="mt-2 text-2xl font-black text-white">{business.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Elige el servicio, profesional y horario. Confirmas tus datos al final.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : router.push(`/b/${slug}`))}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {step === 0 ? business.name : STEPS[step - 1]}
          </button>

          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i <= step ? theme.primary : 'rgba(63,63,70,0.85)' }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Passo {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          {step === 0 && (
            services.length === 0 ? (
              <p className="text-sm text-zinc-500">Este negocio aun no tiene servicios activos.</p>
            ) : (
              <ServiceSelector
                services={services}
                selected={selectedService}
                onSelect={(id) => {
                  setSelectedService(id)
                  setStep(1)
                }}
              />
            )
          )}
          {step === 1 && (
            employees.length === 0 ? (
              <p className="text-sm text-zinc-500">Este negocio aun no tiene profesionales activos.</p>
            ) : (
              <EmployeeSelector
                employees={employees}
                selected={selectedEmployee}
                onSelect={(id) => {
                  setSelectedEmployee(id)
                  setStep(2)
                }}
              />
            )
          )}
          {step === 2 && selectedService && selectedEmployee && (
            <DateTimePicker
              businessId={business.id}
              serviceId={selectedService}
              employeeId={selectedEmployee}
              maxBookingDays={settings?.max_booking_days ?? 30}
              selected={selectedDatetime}
              onSelect={(dt) => setSelectedDatetime(dt)}
            />
          )}
          {step === 3 && selectedService && selectedEmployee && selectedDatetime && (
            <BookingForm
              businessId={business.id}
              serviceId={selectedService}
              employeeId={selectedEmployee}
              startTime={selectedDatetime}
              onSuccess={() => setCompleted(true)}
            />
          )}

          {step < 3 && (
            <Button disabled={!canAdvance()} onClick={() => setStep(step + 1)} className="mt-6 w-full">
              Continuar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function publicTheme(business: Business) {
  const background = business.theme_background_color || '#09090b'
  return {
    primary: business.theme_primary_color || '#10b981',
    background,
    text: business.theme_text_color || '#f4f4f5',
    backgroundImage: business.theme_background_image_url || null,
  }
}

function pageBackground(theme: ReturnType<typeof publicTheme>) {
  return theme.backgroundImage
    ? {
        backgroundColor: theme.background,
        backgroundImage: `linear-gradient(180deg, ${theme.background}f2, ${theme.background}dd), url("${theme.backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : { backgroundColor: theme.background }
}
