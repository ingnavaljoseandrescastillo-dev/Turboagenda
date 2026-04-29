'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { LoginSchema, type LoginInput } from '@/lib/validators'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

export function LoginForm() {
  const { login } = useAuth()
  const { t } = useLanguage()
  const l = t.login
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    try {
      await login(data)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : l.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-zinc-100 mb-1">{l.title}</h1>
        <p className="text-sm text-zinc-500">{l.subtitle}</p>
      </div>

      <Input
        label={l.email}
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label={l.password}
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="-mt-2 text-right">
        <Link href="/forgot-password" className="text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400">
          {l.forgotPassword}
        </Link>
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        {l.submit}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        {l.noAccount}{' '}
        <Link href="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors">
          {l.registerLink}
        </Link>
      </p>
    </form>
  )
}
