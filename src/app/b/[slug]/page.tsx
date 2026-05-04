import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/Logo'
import { ServiceGrid } from '@/components/public/ServiceGrid'
import { ReviewsList } from '@/components/public/ReviewsList'
import Link from 'next/link'
import type { Business, Employee, Review, Service } from '@/types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('businesses').select('name, description').eq('slug', slug).single()
  if (!data) return {}
  return { title: `${data.name} - TurboAgenda`, description: data.description ?? undefined }
}

function imageBackground(url?: string | null) {
  return url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(9,9,11,0.08), rgba(9,9,11,0.68)), url("${url}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined
}

function publicTheme(business: Business) {
  const background = business.theme_background_color || '#09090b'
  return {
    primary: business.theme_primary_color || '#10b981',
    background,
    text: business.theme_text_color || '#f4f4f5',
    backgroundImage: business.theme_background_image_url || null,
    onPrimary: readableTextColor(business.theme_primary_color || '#10b981'),
  }
}

function pageBackground(theme: ReturnType<typeof publicTheme>) {
  return theme.backgroundImage
    ? {
        backgroundColor: theme.background,
        backgroundImage: `linear-gradient(180deg, ${theme.background}f2, ${theme.background}dd), url("${theme.backgroundImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : { backgroundColor: theme.background }
}

function readableTextColor(hex: string) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '10b981'
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#09090b' : '#ffffff'
}

function GalleryPreview({ businessName, images }: { businessName: string; images?: string[] | null }) {
  const items = ['Ambiente', 'Trabalhos', 'Detalhes', 'Resultado']
  const galleryImages = images?.filter(Boolean).slice(0, 4) ?? []

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Galeria</h2>
          <p className="text-sm text-zinc-500">Espaco para mostrar trabalhos realizados e o ambiente do negocio.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item}
            className="aspect-[4/5] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
          >
            <div
              className="flex h-full flex-col justify-end p-4"
              style={
                imageBackground(galleryImages[index]) ?? {
                  background:
                    index % 2 === 0
                      ? 'linear-gradient(145deg, #064e3b 0%, #18181b 58%, #020617 100%)'
                      : 'linear-gradient(145deg, #0f766e 0%, #27272a 55%, #020617 100%)',
                }
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">{businessName}</p>
              <p className="mt-1 text-sm font-bold text-white">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TeamPreview({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-100">Quem atende</h2>
        <p className="text-sm text-zinc-500">Escolha o profissional na hora de reservar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {employees.map((employee) => (
          <div key={employee.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 bg-cover bg-center text-lg font-black text-emerald-300"
                style={imageBackground(employee.avatar_url)}
              >
                {!employee.avatar_url && employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-zinc-100">{employee.name}</p>
                <p className="text-sm text-zinc-500">{employee.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
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
  if (business.is_paused) notFound()

  const [{ data: services }, { data: reviews }, { data: employees }] = await Promise.all([
    supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
    supabase.from('reviews').select('*').eq('business_id', business.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('employees').select('*').eq('business_id', business.id).eq('is_active', true).order('name'),
  ])

  const biz = business as Business
  const svcs = (services ?? []) as Service[]
  const revs = (reviews ?? []) as Review[]
  const emps = (employees ?? []) as Employee[]

  const avgRating = revs.length
    ? (revs.reduce((acc, r) => acc + r.rating, 0) / revs.length).toFixed(1)
    : null
  const theme = publicTheme(biz)

  return (
    <div className="min-h-screen text-zinc-100" style={{ ...pageBackground(theme), color: theme.text }}>
      <header className="border-b border-white/10 bg-black/25 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo size="sm" />
          <Link
            href={`/b/${slug}/book`}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
          >
            Reservar
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 bg-black/20 backdrop-blur">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
                Agenda online
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">{biz.name}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
                {biz.description || 'Reserve online em poucos passos. Escolha o servico, o profissional e o horario disponivel.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
                {biz.address && <span>{biz.address}</span>}
                {biz.phone && <span>{biz.phone}</span>}
                {avgRating && <span>{avgRating} estrelas ({revs.length})</span>}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/b/${slug}/book`}
                  className="rounded-xl px-5 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: theme.primary, color: theme.onPrimary }}
                >
                  Reservar agora
                </Link>
                <a
                  href="#servicos"
                  className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500"
                >
                  Ver servicos
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="aspect-[3/4] overflow-hidden rounded-3xl p-5"
                style={imageBackground(biz.cover_image_url) ?? { backgroundColor: theme.primary }}
              >
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm font-semibold text-emerald-100">Reserve online</p>
                  <p className="mt-1 text-2xl font-black text-white">{biz.name}</p>
                </div>
              </div>
              <div className="mt-10 aspect-[3/4] rounded-3xl bg-black/25 p-5 ring-1 ring-white/10">
                <div className="flex h-full flex-col justify-end">
                  <div
                    className="mb-4 h-16 w-16 rounded-2xl border border-white/10 bg-emerald-500/20 bg-cover bg-center"
                    style={imageBackground(biz.logo_image_url)}
                  />
                  <p className="text-sm font-semibold" style={{ color: theme.primary }}>Servicos ativos</p>
                  <p className="mt-1 text-2xl font-black text-white">{svcs.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-12 px-5 py-10 pb-20">
          <section id="servicos">
            <ServiceGrid services={svcs} slug={slug} />
          </section>
          <TeamPreview employees={emps} />
          <GalleryPreview businessName={biz.name} images={biz.gallery_images} />
          <ReviewsList reviews={revs} />
        </div>
      </main>
    </div>
  )
}
