'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { EmployeeSelector } from '@/components/booking/EmployeeSelector'
import { DateTimePicker } from '@/components/booking/DateTimePicker'
import { BookingForm } from '@/components/booking/BookingForm'
import { Button } from '@/components/ui/Button'
import type { Business, BusinessSettings, Employee, Service } from '@/types'

type PublicLocale = 'pt' | 'en' | 'es'

const bookingCopy = {
  pt: {
    steps: ['Servico', 'Profissional', 'Data e hora', 'Dados'],
    completeTitle: 'Agendamento confirmado!',
    completeSubtitle: 'Recebera a confirmacao em breve.',
    backToProfile: 'Voltar ao perfil',
    onlineBooking: 'Reserva online',
    intro: 'Escolha o servico, profissional e horario. Confirme os seus dados no final.',
    step: 'Passo',
    of: 'de',
    noServices: 'Este negocio ainda nao tem servicos ativos.',
    noEmployees: 'Este negocio ainda nao tem profissionais ativos.',
    continue: 'Continuar',
    serviceTitle: 'Escolha o servico',
    employeeTitle: 'Escolha o colaborador',
    date: {
      title: 'Escolha o dia',
      subtitle: 'Selecione uma data disponivel no calendario.',
      previousMonth: 'Mes anterior',
      nextMonth: 'Proximo mes',
      availableTimes: 'Horarios disponiveis',
      loading: 'A carregar horarios...',
      empty: 'Sem horarios disponiveis para este dia. Escolha outra data no calendario.',
      weekdays: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
    },
    form: {
      title: 'Os seus dados',
      appointmentFor: 'Agendamento para',
      name: 'Nome completo',
      email: 'Email',
      phone: 'Telefone (opcional)',
      birthdate: 'Data de nascimento (opcional)',
      birthdateHelper: 'Usada apenas para mensagens de aniversario do negocio.',
      submit: 'Confirmar agendamento',
      createError: 'Erro ao criar agendamento',
    },
  },
  es: {
    steps: ['Servicio', 'Profesional', 'Fecha y hora', 'Datos'],
    completeTitle: 'Reserva confirmada!',
    completeSubtitle: 'Recibiras la confirmacion en breve.',
    backToProfile: 'Volver al perfil',
    onlineBooking: 'Reserva online',
    intro: 'Elige el servicio, profesional y horario. Confirmas tus datos al final.',
    step: 'Paso',
    of: 'de',
    noServices: 'Este negocio aun no tiene servicios activos.',
    noEmployees: 'Este negocio aun no tiene profesionales activos.',
    continue: 'Continuar',
    serviceTitle: 'Elige el servicio',
    employeeTitle: 'Elige el profesional',
    date: {
      title: 'Elige el dia',
      subtitle: 'Selecciona una fecha disponible en el calendario.',
      previousMonth: 'Mes anterior',
      nextMonth: 'Mes siguiente',
      availableTimes: 'Horarios disponibles',
      loading: 'Cargando horarios...',
      empty: 'No hay horarios disponibles para este dia. Elige otra fecha en el calendario.',
      weekdays: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
    },
    form: {
      title: 'Tus datos',
      appointmentFor: 'Reserva para',
      name: 'Nombre completo',
      email: 'Email',
      phone: 'Telefono (opcional)',
      birthdate: 'Fecha de nacimiento (opcional)',
      birthdateHelper: 'Usada solo para mensajes de cumpleanos del negocio.',
      submit: 'Confirmar reserva',
      createError: 'Error al crear la reserva',
    },
  },
  en: {
    steps: ['Service', 'Professional', 'Date and time', 'Details'],
    completeTitle: 'Booking confirmed!',
    completeSubtitle: 'You will receive a confirmation soon.',
    backToProfile: 'Back to profile',
    onlineBooking: 'Online booking',
    intro: 'Choose the service, professional, and time. Confirm your details at the end.',
    step: 'Step',
    of: 'of',
    noServices: 'This business has no active services yet.',
    noEmployees: 'This business has no active professionals yet.',
    continue: 'Continue',
    serviceTitle: 'Choose a service',
    employeeTitle: 'Choose a professional',
    date: {
      title: 'Choose a day',
      subtitle: 'Select an available date in the calendar.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      availableTimes: 'Available times',
      loading: 'Loading times...',
      empty: 'No times available for this day. Choose another date in the calendar.',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    form: {
      title: 'Your details',
      appointmentFor: 'Booking for',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone (optional)',
      birthdate: 'Birth date (optional)',
      birthdateHelper: 'Only used for birthday messages from the business.',
      submit: 'Confirm booking',
      createError: 'Error creating booking',
    },
  },
}

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
  const timeZone = settings?.time_zone ?? 'Europe/Lisbon'
  const locale = normalizePublicLocale(business.default_language)
  const copy = bookingCopy[locale]
  const currency = business.currency ?? 'EUR'
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
          <h2 className="text-2xl font-bold text-zinc-100">{copy.completeTitle}</h2>
          <p className="text-zinc-500">{copy.completeSubtitle}</p>
          <Button onClick={() => router.push(`/b/${slug}`)} variant="secondary">
            {copy.backToProfile}
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
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>{copy.onlineBooking}</p>
          <h1 className="mt-2 text-2xl font-black text-white">{business.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {copy.intro}
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
            {step === 0 ? business.name : copy.steps[step - 1]}
          </button>

          <div className="flex gap-1.5 mb-4">
            {copy.steps.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i <= step ? theme.primary : 'rgba(63,63,70,0.85)' }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            {copy.step} {step + 1} {copy.of} {copy.steps.length}: {copy.steps[step]}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-6">
          {step === 0 && (
            services.length === 0 ? (
              <p className="text-sm text-zinc-500">{copy.noServices}</p>
            ) : (
              <ServiceSelector
                services={services}
                selected={selectedService}
                primaryColor={theme.primary}
                currency={currency}
                title={copy.serviceTitle}
                onSelect={(id) => {
                  setSelectedService(id)
                  setStep(1)
                }}
              />
            )
          )}
          {step === 1 && (
            employees.length === 0 ? (
              <p className="text-sm text-zinc-500">{copy.noEmployees}</p>
            ) : (
              <EmployeeSelector
                employees={employees}
                selected={selectedEmployee}
                primaryColor={theme.primary}
                title={copy.employeeTitle}
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
              availableMonths={settings?.available_months ?? []}
              timeZone={timeZone}
              selected={selectedDatetime}
              primaryColor={theme.primary}
              onPrimaryColor={theme.onPrimary}
              localeCode={locale}
              labels={copy.date}
              onSelect={(dt) => setSelectedDatetime(dt)}
            />
          )}
          {step === 3 && selectedService && selectedEmployee && selectedDatetime && (
            <BookingForm
              businessId={business.id}
              serviceId={selectedService}
              employeeId={selectedEmployee}
              startTime={selectedDatetime}
              timeZone={timeZone}
              primaryColor={theme.primary}
              onPrimaryColor={theme.onPrimary}
              labels={copy.form}
              onSuccess={() => setCompleted(true)}
            />
          )}

          {step < 3 && (
            <Button
              disabled={!canAdvance()}
              onClick={() => setStep(step + 1)}
              className="mt-6 w-full hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
            >
              {copy.continue}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function normalizePublicLocale(value: unknown): PublicLocale {
  return value === 'en' || value === 'es' || value === 'pt' ? value : 'pt'
}

function publicTheme(business: Business) {
  const background = business.theme_background_color || '#09090b'
  const primary = business.theme_primary_color || '#10b981'
  return {
    primary,
    background,
    text: business.theme_text_color || '#f4f4f5',
    backgroundImage: business.theme_background_image_url || null,
    onPrimary: readableTextColor(primary),
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

function readableTextColor(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '10b981'
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#09090b' : '#ffffff'
}
