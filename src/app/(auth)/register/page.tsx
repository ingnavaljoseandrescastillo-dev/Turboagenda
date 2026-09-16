import { RegisterForm } from '@/components/auth/RegisterForm'
import { isGoogleAuthEnabled } from '@/lib/google-auth'

export default async function RegisterPage() {
  return <RegisterForm googleEnabled={await isGoogleAuthEnabled()} />
}
