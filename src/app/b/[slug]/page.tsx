import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { Particles } from '@/components/ui/Particles'
import { ServiceGrid } from '@/components/public/ServiceGrid'
import { ReviewsList } from '@/components/public/ReviewsList'
import Link from 'next/link'
import type { Business, Service, Review } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('name, description').eq('slug', slug).single()
  if (!data) return {}
  return { title: `${data.name} — TurboAgenda`, description: data.description ?? undefined }
}

export default async function BusinessPublicPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!business) notFound()

  const [{ data: services }, { data: reviews }] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
    supabase.from('reviews').select('*').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10),
  ])

  const biz = business as Business
  const svcs = (services ?? []) as Service[]
  const revs = (reviews ?? []) as Review[]

  const avgRating = revs.length
    ? (revs.reduce((acc, r) => acc + r.rating, 0) / revs.length).toFixed(1)
    : null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Fondo #3: partículas flotantes */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at center, #052e1640 0%, #09090b 70%)' }}
      >
        <Particles count={16} />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="bg-gradient-to-b from-zinc-900/80 to-zinc-950/40 backdrop-blur border-b border-zinc-800">
          <div className="max-w-3xl mx-auto px-5 py-6">
            <div className="flex items-center justify-between mb-5">
              <Logo size="sm" />
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-300 to-emerald-600 rounded-2xl flex items-center justify-center text-zinc-950 text-2xl font-black flex-shrink-0">
                {biz.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-zinc-100" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {biz.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 flex-wrap">
                  {biz.address && (
                    <span className="flex items-center gap-1">
                      <span>📍</span>{biz.address}
                    </span>
                  )}
                  {avgRating && (
                    <span className="flex items-center gap-1">
                      <span className="text-emerald-400">⭐</span>
                      {avgRating} ({revs.length})
                    </span>
                  )}
                </div>
              </div>
              <Link
                href={`/b/${slug}/book`}
                className="bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-400 transition flex-shrink-0 shadow-lg shadow-emerald-500/20"
              >
                Marcar
              </Link>
            </div>

            {biz.description && (
              <p className="text-sm text-zinc-400 mt-4 leading-relaxed">{biz.description}</p>
            )}
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-5 py-8 space-y-10 pb-16">
          <ServiceGrid services={svcs} slug={slug} />
          <ReviewsList reviews={revs} />
        </div>
      </div>
    </div>
  )
}
