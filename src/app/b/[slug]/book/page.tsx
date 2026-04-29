import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookClient } from './BookClient'
import type { Business, BusinessSettings, Employee, Service } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ service?: string }>
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { service } = await searchParams
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) notFound()

  const [{ data: services }, { data: employees }, { data: settings }] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
    supabase.from('employees').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
    supabase.from('business_settings').select('*').eq('business_id', business.id).maybeSingle(),
  ])

  return (
    <BookClient
      slug={slug}
      business={business as Business}
      settings={settings as BusinessSettings | null}
      services={(services ?? []) as Service[]}
      employees={(employees ?? []) as Employee[]}
      initialService={service ?? null}
    />
  )
}
