'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validators'

export function ForgotPasswordForm() {
  const { t } = useLanguage()
  const copy = t.forgotPassword
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) })

  async function onSubmit(data: ForgotPasswordInput) {
    setServerError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo })

    if (error) {
      setServerError(error.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-lg font-black text-emerald-300">
          OK
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{copy.sentTitle}</h1>
          <p className="mt-2 text-sm text-zinc-400">{copy.sentDesc}</p>
        </div>
        <Link href="/login" className="inline-flex text-sm font-semibold text-emerald-400 hover:text-emerald-300">
          {copy.backToLogin}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="mb-1 text-2xl font-bold text-zinc-100">{copy.title}</h1>
        <p className="text-sm text-zinc-500">{copy.subtitle}</p>
      </div>

      <Input
        label={copy.email}
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register('email')}
      />

      {serverError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
        {copy.submit}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="text-emerald-500 transition-colors hover:text-emerald-400">
          {copy.backToLogin}
        </Link>
      </p>
    </form>
  )
}
