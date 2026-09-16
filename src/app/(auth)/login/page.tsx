import { LoginForm } from '@/components/auth/LoginForm'
import { isGoogleAuthEnabled } from '@/lib/google-auth'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [googleEnabled, params] = await Promise.all([isGoogleAuthEnabled(), searchParams])
  return <LoginForm googleEnabled={googleEnabled} authError={Boolean(params.error)} />
}
