'use client'

import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useEffect, useState } from 'react'
import { DEFAULT_BUSINESS_TIME_ZONE, formatDateTime } from '@/lib/utils'

const ClientSchema = z.object({
  client_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  client_email: z.string().email('Email invalido').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  client_birthdate: z.string().optional(),
  payment_proof: z
    .custom<FileList>()
    .optional()
    .refine((files) => !files?.[0] || files[0].size <= 8 * 1024 * 1024, 'O comprovativo nao pode superar 8 MB')
    .refine(
      (files) =>
        !files?.[0] ||
        ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(files[0].type),
      'Use JPG, PNG, WEBP ou PDF'
    ),
  accepted_terms: z.boolean().refine((value) => value, 'Tem de aceitar os termos e a politica de privacidade'),
}).refine((value) => Boolean(value.client_email || value.client_phone), {
  message: 'Informe email ou telefone para contacto',
  path: ['client_phone'],
})

type ClientInput = z.infer<typeof ClientSchema>

interface BookingFormProps {
  businessId: string
  serviceId: string
  serviceIds?: string[]
  employeeId: string
  startTime: string
  timeZone?: string
  primaryColor?: string
  onPrimaryColor?: string
  totalAmount?: number
  currency?: string
  depositRequired?: boolean
  depositPercent?: number
  depositMbwayPhone?: string | null
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
  onSuccess: (depositApplied: boolean) => void
}

export function BookingForm({
  businessId,
  serviceId,
  serviceIds,
  employeeId,
  startTime,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
  primaryColor = '#10b981',
  onPrimaryColor = '#09090b',
  totalAmount = 0,
  currency = 'EUR',
  depositRequired = false,
  depositPercent = 30,
  depositMbwayPhone,
  labels = defaultLabels,
  onSuccess,
}: BookingFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [clientStatus, setClientStatus] = useState<'unknown' | 'checking' | 'new' | 'returning'>('unknown')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: { accepted_terms: false },
  })

  const watchedEmail = useWatch({ control, name: 'client_email' })
  const watchedPhone = useWatch({ control, name: 'client_phone' })
  const hasContactForLookup = hasLookupContact(watchedEmail, watchedPhone)
  const effectiveClientStatus = depositRequired && hasContactForLookup ? clientStatus : 'unknown'
  const depositApplies = depositRequired && effectiveClientStatus !== 'returning'

  useEffect(() => {
    if (!depositRequired || !hasContactForLookup) return

    let cancelled = false
    const timeout = window.setTimeout(() => {
      setClientStatus('checking')
      void lookupCompletedAppointment(businessId, watchedEmail, watchedPhone)
        .then((hasCompleted) => {
          if (!cancelled) setClientStatus(hasCompleted ? 'returning' : 'new')
        })
        .catch(() => {
          if (!cancelled) setClientStatus('unknown')
        })
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [businessId, depositRequired, hasContactForLookup, watchedEmail, watchedPhone])

  async function onSubmit(formData: ClientInput) {
    const { accepted_terms: acceptedTerms, payment_proof: paymentProof, ...data } = formData
    if (!acceptedTerms) return
    const proofFile = paymentProof?.[0]
    const hasCompletedAppointment = depositRequired
      ? await lookupCompletedAppointment(businessId, data.client_email, data.client_phone)
      : false
    const depositAppliesOnSubmit = depositRequired && !hasCompletedAppointment

    if (depositAppliesOnSubmit && !proofFile) {
      setServerError('Carregue o comprovativo MB WAY para bloquear o horario.')
      return
    }

    setServerError(null)
    try {
      const appointmentPayload = {
        business_id: businessId,
        service_id: serviceId,
        service_ids: serviceIds?.length ? serviceIds : [serviceId],
        employee_id: employeeId,
        start_time: new Date(startTime).toISOString(),
        ...data,
      }
      const payload = new FormData()
      payload.append('appointment', JSON.stringify(appointmentPayload))
      if (depositAppliesOnSubmit && proofFile) payload.append('payment_proof', proofFile)

      const res = await fetch('/api/appointments', {
        method: 'POST',
        body: payload,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? labels.createError)
      onSuccess(depositAppliesOnSubmit)
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

      {depositRequired && (
        <div
          className={`rounded-xl border p-4 ${
            effectiveClientStatus === 'returning'
              ? 'border-emerald-500/25 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10'
          }`}
        >
          <p className={effectiveClientStatus === 'returning' ? 'text-sm font-semibold text-emerald-100' : 'text-sm font-semibold text-amber-100'}>
            Sinal MB WAY para clientes novos
          </p>
          {effectiveClientStatus === 'returning' ? (
            <p className="mt-2 text-sm leading-6 text-emerald-50/85">
              Encontramos uma cita culminada com estes dados. Pode confirmar sem carregar comprovativo.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-amber-50/85">
                Clientes novos transferem {formatMoney(calculateDeposit(totalAmount, depositPercent), currency)} por MB WAY para{' '}
                <span className="font-bold text-white">{depositMbwayPhone}</span> e carregam o comprovativo abaixo.
              </p>
              <p className="mt-2 text-xs leading-5 text-amber-100/70">
                Total estimado: {formatMoney(totalAmount, currency)}. Sinal: {depositPercent}%. Se ja veio antes,
                use o mesmo email ou telefone para dispensar o sinal.
                {effectiveClientStatus === 'checking' ? ' A verificar o seu historico...' : ''}
              </p>
            </>
          )}
        </div>
      )}

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

        {depositApplies && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-300">Comprovativo MB WAY</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-100"
              {...register('payment_proof')}
            />
            <span className="text-xs text-zinc-500">
              A reserva so bloqueia o horario depois de carregar este comprovativo.
            </span>
            {errors.payment_proof?.message && (
              <span className="text-xs text-red-400">{errors.payment_proof.message}</span>
            )}
          </label>
        )}

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

function calculateDeposit(total: number, percent: number) {
  return Math.max(0, Math.round(total * percent) / 100)
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(value)
}

function hasLookupContact(email?: string, phone?: string) {
  return Boolean(email?.includes('@') || (phone?.replace(/\D/g, '').length ?? 0) >= 6)
}

async function lookupCompletedAppointment(businessId: string, email?: string, phone?: string) {
  if (!hasLookupContact(email, phone)) return false
  const params = new URLSearchParams({ business_id: businessId })
  if (email) params.set('email', email)
  if (phone) params.set('phone', phone)

  const res = await fetch(`/api/public-client-status?${params.toString()}`)
  if (!res.ok) return false
  const json = await res.json()
  return Boolean(json.data?.has_completed_appointment)
}
