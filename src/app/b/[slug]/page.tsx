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

function GalleryPreview({ businessName }: { businessName: string }) {
  const items = ['Ambiente', 'Trabalhos', 'Detalhes', 'Resultado']

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
              style={{
                background:
                  index % 2 === 0
                    ? 'linear-gradient(145deg, #064e3b 0%, #18181b 58%, #020617 100%)'
                    : 'linear-gradient(145deg, #0f766e 0%, #27272a 55%, #020617 100%)',
              }}
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-black text-emerald-300">
                {employee.name.charAt(0).toUpperCase()}
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Logo size="sm" />
          <Link
            href={`/b/${slug}/book`}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Reservar
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-zinc-800 bg-zinc-900">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Agenda online</p>
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
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-emerald-400"
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
              <div className="aspect-[3/4] rounded-3xl bg-gradient-to-br from-emerald-500 to-zinc-900 p-5">
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm font-semibold text-emerald-950">Proximo horario</p>
                  <p className="mt-1 text-2xl font-black text-white">Online</p>
                </div>
              </div>
              <div className="mt-10 aspect-[3/4] rounded-3xl bg-gradient-to-br from-zinc-800 to-emerald-950 p-5">
                <div className="flex h-full flex-col justify-end">
                  <p className="text-sm font-semibold text-emerald-200">Servicos ativos</p>
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
          <GalleryPreview businessName={biz.name} />
          <ReviewsList reviews={revs} />
        </div>
      </main>
    </div>
  )
}
