import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/auth/OnboardingWizard'
import { getBusinessForUser } from '@/lib/api-helpers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Onboarding - TurboAgenda' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  if (business) redirect('/dashboard/settings')

  return (
    <div className="min-h-full flex items-center justify-center py-10">
      <OnboardingWizard />
    </div>
  )
}
