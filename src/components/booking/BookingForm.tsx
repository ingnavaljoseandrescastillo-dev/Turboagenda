'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'
import { formatDateTime } from '@/lib/utils'

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
  onSuccess: () => void
}

export function BookingForm({ businessId, serviceId, employeeId, startTime, onSuccess }: BookingFormProps) {
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
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar agendamento')
      onSuccess()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar agendamento')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-zinc-100">Os seus dados</h3>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p className="text-sm text-emerald-400 font-medium">
          Agendamento para {formatDateTime(startTime)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome completo"
          placeholder="Maria Silva"
          error={errors.client_name?.message}
          {...register('client_name')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="maria@email.com"
          error={errors.client_email?.message}
          {...register('client_email')}
        />
        <Input
          label="Telefone (opcional)"
          type="tel"
          placeholder="+351 912 345 678"
          error={errors.client_phone?.message}
          {...register('client_phone')}
        />
        <Input
          label="Data de nascimento (opcional)"
          type="date"
          helper="Usada apenas para mensagens de aniversario do negocio."
          error={errors.client_birthdate?.message}
          {...register('client_birthdate')}
        />

        {serverError && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full">
          Confirmar agendamento
        </Button>
      </form>
    </div>
  )
}
