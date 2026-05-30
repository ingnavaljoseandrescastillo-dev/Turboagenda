'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'
import { DEFAULT_BUSINESS_TIME_ZONE, formatDateTime } from '@/lib/utils'

const ClientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  client_email: z.string().email('Email inválido'),
  client_phone: z.string().optional(),
  client_birthdate: z.string().optional(),
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
  } = useForm<ClientInput>({ resolver: zodResolver(ClientSchema) })

  async function onSubmit(data: ClientInput) {
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
      </form>
    </div>
  )
}

const defaultLabels = {
  title: 'Os seus dados',
  appointmentFor: 'Agendamento para',
  name: 'Nome completo',
  email: 'Email',
  phone: 'Telefone (opcional)',
  birthdate: 'Data de nascimento (opcional)',
  birthdateHelper: 'Usada apenas para mensagens de aniversario do negocio.',
  submit: 'Confirmar agendamento',
  createError: 'Erro ao criar agendamento',
}
