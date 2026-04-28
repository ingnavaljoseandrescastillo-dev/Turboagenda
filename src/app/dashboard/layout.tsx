import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopNav } from '@/components/dashboard/TopNav'
import type { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ownerData } = await supabase
    .from('business_owners')
    .select('businesses(name)')
    .eq('user_id', user.id)
    .single()

  const businessName = (ownerData?.businesses as unknown as { name: string } | null)?.name

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar businessName={businessName} plan="Plus" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav user={user} businessName={businessName} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
