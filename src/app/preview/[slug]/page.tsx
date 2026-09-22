import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PUBLIC_BUSINESS_COLUMNS } from '@/lib/public-business'
import { formatCurrency } from '@/lib/utils'
import type { Business, Service } from '@/types'

interface PreviewPageProps {
  params: Promise<{ slug: string }>
}

export const metadata = {
  title: 'Protótipo da página pública | TurboAgenda',
  robots: { index: false, follow: false },
}

export default async function MobileBusinessPreview({ params }: PreviewPageProps) {
  const { slug } = await params
  const supabase = await createAdminClient()
  const { data: business } = await supabase
    .from('businesses')
    .select(PUBLIC_BUSINESS_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (!business || business.is_paused) notFound()

  const { data: services } = await supabase
    .from('services')
    .select('id,name,description,price,duration_minutes')
    .eq('business_id', business.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('name')
    .limit(6)

  const biz = business as unknown as Business
  const items = (services ?? []) as Service[]
  const gallery = (biz.gallery_images ?? []).filter(Boolean)
  const accent = biz.theme_primary_color ?? '#8a6f5b'
  const description = biz.description?.trim() || 'Um espaço dedicado a cuidar de si, com atenção a cada detalhe.'

  return (
    <main className="min-h-screen bg-[#f1ebe5] text-[#352b28]" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="fixed inset-x-0 top-0 z-30 bg-[#2e2523] px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-white">
        Protótipo visual · Esta página ainda não está ativa para os clientes
      </div>

      <section className="relative mx-auto min-h-[760px] max-w-[1100px] overflow-hidden sm:min-h-[820px]" style={{ minHeight: '92svh' }}>
        {biz.cover_image_url ? (
          <div
            aria-label={`Fotografia de capa de ${biz.name}`}
            className="absolute inset-0 bg-cover bg-center sm:bg-[center_36%]"
            style={{ backgroundImage: `url("${biz.cover_image_url}")` }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${accent}, #40332d)` }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,19,18,.40)_0%,transparent_28%,rgba(24,19,18,.10)_48%,rgba(24,19,18,.70)_76%,#f1ebe5_100%)]" />

        <div className="relative z-10 flex min-h-[760px] flex-col justify-between px-5 pb-14 pt-20 sm:min-h-[820px] sm:px-10" style={{ minHeight: '92svh' }}>
          <div className="flex items-start justify-between gap-4">
            <span className="rounded-full border border-white/55 bg-white/15 px-4 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-white backdrop-blur-md">
              Beleza & cuidado
            </span>
            {biz.logo_image_url && (
              // The business logo is already a public, owner-uploaded asset.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={biz.logo_image_url} alt={`Logo ${biz.name}`} className="h-12 w-12 rounded-full border-2 border-white/80 bg-white object-cover shadow-lg" />
            )}
          </div>

          <div className="mx-auto w-full max-w-[680px] text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.25em] text-white/85">Bem-vinda ao meu espaço</p>
            <h1 className="text-5xl font-black leading-[.95] tracking-tight text-white drop-shadow-[0_3px_12px_rgba(0,0,0,.32)] sm:text-7xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              {biz.name}
            </h1>
            <p className="mx-auto mt-4 max-w-[470px] text-sm leading-relaxed text-white/90 sm:text-base">
              {biz.address || 'Beleza com atenção a cada detalhe'}
            </p>
            <a
              href="#sobre"
              className="mx-auto mt-8 flex w-full max-w-[410px] items-center justify-between rounded-full border border-white/70 bg-white/90 px-5 py-4 text-left shadow-[0_15px_35px_rgba(41,30,25,.18)] transition-transform hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                {biz.logo_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={biz.logo_image_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                )}
                <span>
                  <strong className="block text-sm text-[#43332d]">Conheça o espaço</strong>
                  <span className="block text-xs text-[#826c60]">Serviços, fotos e informações</span>
                </span>
              </span>
              <span className="text-xl text-[#826c60]">↓</span>
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-5 pb-24 sm:px-10">
        <section id="sobre" className="mx-auto max-w-[670px] scroll-mt-10 py-10 text-center sm:py-16">
          <span className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: accent }}>Um pouco sobre nós</span>
          <h2 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Um momento só para si
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-[#75645b]">{description}</p>
          {biz.address && <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#8f7b70]">⌖ {biz.address}</p>}
        </section>

        {gallery.length > 0 && (
          <section className="py-8" aria-label="Galeria de fotografias">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: accent }}>Momentos</p>
                <h2 className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Galeria</h2>
              </div>
              <span className="text-xs text-[#8f7b70]">Deslize para ver →</span>
            </div>
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
              {gallery.map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${image}-${index}`} src={image} alt={`Fotografia ${index + 1} de ${biz.name}`} className="aspect-[3/4] w-[75%] shrink-0 snap-center rounded-3xl object-cover sm:w-[32%]" />
              ))}
            </div>
          </section>
        )}

        <section id="servicos" className="py-8">
          <p className="text-xs font-bold uppercase tracking-[.22em]" style={{ color: accent }}>Feito para si</p>
          <h2 className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Serviços em destaque</h2>
          <p className="mt-2 text-sm text-[#826f63]">Explore alguns dos cuidados disponíveis.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((service) => (
              <div key={service.id} className="rounded-3xl border border-[#dccfc4] bg-[#fbf8f5] p-5 shadow-[0_10px_30px_rgba(70,51,42,.05)]">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-[#42332d]">{service.name}</h3>
                  <span className="shrink-0 font-bold" style={{ color: accent }}>{formatCurrency(Number(service.price), biz.currency)}</span>
                </div>
                {service.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#826f63]">{service.description}</p>}
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#9d887b]">{service.duration_minutes} min</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[#9d887b]">Os preços e serviços acima são ilustrativos da apresentação visual; a reserva continua na página atual.</p>
        </section>
      </div>
    </main>
  )
}
