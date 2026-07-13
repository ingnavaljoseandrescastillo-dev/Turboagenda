'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { z } from 'zod'
import { RegisterSchema, type RegisterInput } from '@/lib/validators'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

const RegisterWithTermsSchema = RegisterSchema.extend({
  acceptedTerms: z.boolean().refine((value) => value, 'Tem de aceitar os termos e a politica de privacidade'),
})

type RegisterWithTermsInput = RegisterInput & { acceptedTerms: boolean }

export function RegisterForm() {
  const { register: registerUser } = useAuth()
  const { t } = useLanguage()
  const r = t.register
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterWithTermsInput>({
    resolver: zodResolver(RegisterWithTermsSchema),
    defaultValues: { acceptedTerms: false },
  })

  async function onSubmit(data: RegisterWithTermsInput) {
    const { acceptedTerms, ...registrationData } = data
    if (!acceptedTerms) return

    setServerError(null)
    try {
      const result = await registerUser(registrationData)
      if (result === 'confirmation_required') setEmailSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : r.error)
    }
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="text-5xl">📧</div>
        <h2 className="font-semibold text-zinc-100">{r.emailSentTitle}</h2>
        <p className="text-sm text-zinc-400 whitespace-pre-line">{r.emailSentDesc}</p>
        <p className="text-xs text-zinc-600">{r.emailSentClose}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">{r.title}</h1>
        <p className="text-sm text-zinc-500">{r.subtitle}</p>
      </div>

      <Input
        label={r.businessName}
        type="text"
        placeholder={r.businessNamePlaceholder}
        error={errors.businessName?.message}
        {...register('businessName')}
      />
      <Input
        label={r.phone}
        type="tel"
        placeholder={r.phonePlaceholder}
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Input
        label={r.email}
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label={r.password}
        type="password"
        placeholder={r.passwordPlaceholder}
        error={errors.password?.message}
        {...register('password')}
      />

      {serverError && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs leading-5 text-zinc-400">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-emerald-500"
          {...register('acceptedTerms')}
        />
        <span>
          {r.noCard} Ao criar conta, li e aceito os{' '}
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
      {errors.acceptedTerms && (
        <p className="text-xs text-red-400">{errors.acceptedTerms.message}</p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        {r.submit}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        {r.hasAccount}{' '}
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 transition-colors">
          {r.loginLink}
        </Link>
      </p>
    </form>
  )
}
