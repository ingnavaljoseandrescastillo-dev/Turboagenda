'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'
import { DEFAULT_BUSINESS_TIME_ZONE, formatDateTime } from '@/lib/utils'

const ClientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  client_email: z.string().email('Email invalido').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  client_birthdate: z.string().optional(),
  accepted_terms: z.boolean().refine((value) => value, 'Tem de aceitar os termos e a politica de privacidade'),
}).refine((value) => Boolean(value.client_email || value.client_phone), {
  message: 'Informe email ou telefone para contacto',
  path: ['client_phone'],
})

type ClientInput = z.infer<typeof ClientSchema>

interface BookingFormProps {
  businessId: string
  serviceId: string
  employeeId: string
  startTime: string
  timeZone?: string
  primaryColor?: string
  onPrimaryColor?: string
  labels?: {
    title: string
    appointmentFor: string
    name: string
    email: string
    phone: string
    birthdate: string
    birthdateHelper: string
    legalConsent: string
    legalConsentError: string
    submit: string
    createError: string
  }
  onSuccess: () => void
}

export function BookingForm({
  businessId,
  serviceId,
  employeeId,
  startTime,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
  primaryColor = '#10b981',
  onPrimaryColor = '#09090b',
  labels = defaultLabels,
  onSuccess,
}: BookingFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: { accepted_terms: false },
  })

  async function onSubmit(formData: ClientInput) {
    const { accepted_terms: acceptedTerms, ...data } = formData
    if (!acceptedTerms) return

    setServerError(null)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          service_id: serviceId,
          employee_id: employeeId,
          start_time: new Date(startTime).toISOString(),
          ...data,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? labels.createError)
      onSuccess()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : labels.createError)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-100">{labels.title}</h3>

      <div className="rounded-xl border p-3" style={{ borderColor: `${primaryColor}33`, backgroundColor: `${primaryColor}0d` }}>
        <p className="text-sm font-medium" style={{ color: primaryColor }}>
          {labels.appointmentFor} {formatDateTime(startTime, timeZone)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={labels.name}
          placeholder="Maria Silva"
          error={errors.client_name?.message}
          {...register('client_name')}
        />
        <Input
          label={labels.email}
          type="email"
          placeholder="maria@email.com"
          error={errors.client_email?.message}
          {...register('client_email')}
        />
        <Input
          label={labels.phone}
          type="tel"
          placeholder="+351 912 345 678"
          error={errors.client_phone?.message}
          {...register('client_phone')}
        />
        <Input
          label={labels.birthdate}
          type="date"
          helper={labels.birthdateHelper}
          error={errors.client_birthdate?.message}
          {...register('client_birthdate')}
        />

        <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-5 text-zinc-400">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-500"
            {...register('accepted_terms')}
          />
          <span>
            {labels.legalConsent}{' '}
            <Link href="/termos" className="text-zinc-200 transition-colors hover:text-white">
              Termos
            </Link>{' '}
            e a{' '}
            <Link href="/privacidade" className="text-zinc-200 transition-colors hover:text-white">
              Politica de Privacidade
            </Link>
            .
          </span>
        </label>
        {errors.accepted_terms && (
          <p className="text-xs text-red-400">{labels.legalConsentError}</p>
        )}

        {serverError && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          className="w-full hover:opacity-90"
          style={{ backgroundColor: primaryColor, color: onPrimaryColor }}
        >
          {labels.submit}
        </Button>

        <p className="text-center text-xs leading-5 text-zinc-500">
          Ao confirmar, os seus dados serao usados para gerir esta marcacao. Consulte a{' '}
          <Link href="/privacidade" className="text-zinc-300 transition-colors hover:text-white">
            Politica de Privacidade
          </Link>
          .
        </p>
      </form>
    </div>
  )
}

const defaultLabels = {
  title: 'Os seus dados',
  appointmentFor: 'Agendamento para',
  name: 'Nome completo',
  email: 'Email (opcional)',
  phone: 'Telefone',
  birthdate: 'Data de nascimento (opcional)',
  birthdateHelper: 'Usada apenas para mensagens de aniversario do negocio.',
  legalConsent: 'Li e aceito os',
  legalConsentError: 'Tem de aceitar os termos e a politica de privacidade para confirmar.',
  submit: 'Confirmar agendamento',
  createError: 'Erro ao criar agendamento',
}
