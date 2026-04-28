'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { LoginSchema, type LoginInput } from '@/lib/validators'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

export function LoginForm() {
  const { login } = useAuth()
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
      setServerError(err instanceof Error ? err.message : 'Erro ao iniciar sessão')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Senha"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      {serverError && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        Entrar
      </Button>

      <p className="text-center text-sm text-zinc-500">
        Não tem conta?{' '}
        <Link href="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors">
          Registar gratuitamente
        </Link>
      </p>
    </form>
  )
}
