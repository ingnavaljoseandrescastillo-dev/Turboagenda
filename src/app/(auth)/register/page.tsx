import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata = { title: 'Criar Conta — TurboAgenda' }

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-1">Comece grátis</h1>
      <p className="text-sm text-zinc-500 mb-6">30 dias de trial sem cartão de crédito</p>
      <RegisterForm />
    </div>
  )
}
