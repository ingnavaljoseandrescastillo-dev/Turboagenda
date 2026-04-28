import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Iniciar Sessão — TurboAgenda' }

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-100 mb-1">Bem-vindo de volta</h1>
      <p className="text-sm text-zinc-500 mb-6">Inicie sessão na sua conta</p>
      <LoginForm />
    </div>
  )
}
