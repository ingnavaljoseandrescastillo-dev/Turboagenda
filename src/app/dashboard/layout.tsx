import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBusinessForUser } from '@/lib/api-helpers'
import { DashboardPreferenceSync } from '@/components/dashboard/DashboardPreferenceSync'
import { MobileBottomNav, Sidebar } from '@/components/dashboard/Sidebar'
import { TopNav } from '@/components/dashboard/TopNav'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const business = await getBusinessForUser(supabase, user.id)
  const businessName = business?.name

  return (
    <div className="flex min-h-screen bg-zinc-950 md:h-screen md:overflow-hidden">
      <DashboardPreferenceSync locale={business?.default_language ?? 'pt'} />
      <Sidebar businessName={businessName} plan="Plus" />
      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <TopNav user={user} businessName={businessName} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
