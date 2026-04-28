'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { RegisterSchema, type RegisterInput } from '@/lib/validators'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState } from 'react'

export function RegisterForm() {
  const { register: registerUser } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema) })

  async function onSubmit(data: RegisterInput) {
    setServerError(null)
    try {
      await registerUser(data)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar conta')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome do Negócio"
        type="text"
        placeholder="Ex: Salão da Maria"
        error={errors.businessName?.message}
        {...register('businessName')}
      />
      <Input
        label="Telefone"
        type="tel"
        placeholder="+351 912 345 678"
        error={errors.phone?.message}
        {...register('phone')}
      />
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
        placeholder="Mínimo 6 caracteres"
        error={errors.password?.message}
        {...register('password')}
      />

      {serverError && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={isSubmitting} className="w-full mt-2">
        Criar conta — 30 dias grátis
      </Button>

      <p className="text-center text-xs text-zinc-500">
        Sem cartão de crédito. Cancele quando quiser.
      </p>

      <p className="text-center text-sm text-zinc-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-emerald-500 hover:text-emerald-400 transition-colors">
          Iniciar sessão
        </Link>
      </p>
    </form>
  )
}
