'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useLanguage } from '@/contexts/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { ResetPasswordSchema, type ResetPasswordInput } from '@/lib/validators'

export function ResetPasswordForm() {
  const router = useRouter()
  const { t } = useLanguage()
  const copy = t.resetPassword
  const [serverError, setServerError] = useState<string | null>(null)
  const [updated, setUpdated] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordSchema) })

  async function onSubmit(data: ResetPasswordInput) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      setServerError(error.message)
      return
    }

    setUpdated(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 1000)
  }

  if (updated) {
    return (
      <div className="space-y-4 py-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-lg font-black text-emerald-300">
          OK
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{copy.updatedTitle}</h1>
          <p className="mt-2 text-sm text-zinc-400">{copy.updatedDesc}</p>
        </div>
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
        label={copy.password}
        type="password"
        placeholder={copy.passwordPlaceholder}
        error={errors.password?.message}
        {...register('password')}
      />
      <Input
        label={copy.confirmPassword}
        type="password"
        placeholder={copy.confirmPasswordPlaceholder}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
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
