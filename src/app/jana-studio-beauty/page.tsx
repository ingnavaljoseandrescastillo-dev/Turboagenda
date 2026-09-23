import Image from 'next/image'

export const metadata = {
  title: 'Jana Studio Beauty | Paços de Ferreira',
  description: 'Nail designer em Paços de Ferreira. Conheça os serviços de Jana Studio Beauty.',
  robots: { index: false, follow: false },
}

const services = [
  { name: 'Alongamentos', detail: 'Elegância e resistência à sua medida' },
  { name: 'Fibra', detail: 'Acabamento natural e duradouro' },
  { name: 'Soft Gel', detail: 'Leveza, conforto e beleza' },
  { name: 'Tips', detail: 'Comprimento e formato personalizados' },
  { name: 'Banho Gel', detail: 'Proteção e brilho para as suas unhas' },
  { name: 'Verniz Gel', detail: 'Cor impecável por mais tempo' },
]

export default function JanaStudioBeautyShowcase() {
  return (
    <main className="min-h-screen bg-[#f7eee8] text-[#281d19]" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <section className="relative mx-auto min-h-[760px] max-w-[1100px] overflow-hidden" style={{ minHeight: '94svh' }}>
        <Image
          src="/showcase/jana-studio-beauty/hero.jpeg"
          alt="Jana, profissional de beleza"
          fill
          priority
          sizes="(max-width: 1100px) 100vw, 1100px"
          className="object-cover object-[54%_center] sm:object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,23,19,.20)_0%,rgba(32,23,19,.04)_34%,rgba(32,23,19,.58)_70%,#f7eee8_100%)]" />

        <div className="relative z-10 flex min-h-[760px] flex-col justify-between px-5 pb-16 pt-8 sm:px-10" style={{ minHeight: '94svh' }}>
          <div className="flex items-start justify-between gap-4">
            <span className="mt-1 rounded-full border border-white/70 bg-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-white shadow-sm backdrop-blur-md">
              Nail designer
            </span>
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#fff8f2] p-2 shadow-[0_12px_35px_rgba(45,30,22,.28)] sm:h-32 sm:w-32">
              <Image
                src="/showcase/jana-studio-beauty/logo.jpeg"
                alt="Logótipo Jana Studio Beauty"
                width={220}
                height={122}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[680px] text-center text-white">
            <p className="text-[11px] font-bold uppercase tracking-[.28em] text-white/85">Paços de Ferreira</p>
            <h1 className="mt-3 text-5xl font-black leading-[.92] tracking-[-.04em] drop-shadow-[0_3px_14px_rgba(0,0,0,.3)] sm:text-7xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Jana Studio<br /><span className="font-medium italic text-[#f4c5b9]">Beauty</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/90 sm:text-base">
              Unhas cuidadas, elegantes e feitas para refletir a sua personalidade.
            </p>
            <a
              href="#servicos"
              className="mx-auto mt-7 flex w-full max-w-[410px] items-center justify-between rounded-full border border-white/75 bg-white/95 p-2.5 pr-5 text-left text-[#35251f] shadow-[0_16px_40px_rgba(45,30,22,.22)] transition-transform hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#fff8f2] p-1.5">
                  <Image src="/showcase/jana-studio-beauty/logo.jpeg" alt="" width={110} height={61} className="h-auto w-full object-contain" />
                </span>
                <span>
                  <strong className="block text-sm">Agende o seu horário</strong>
                  <span className="block text-xs text-[#8a6a5d]">Escolha o serviço ideal para si</span>
                </span>
              </span>
              <span aria-hidden="true" className="text-2xl text-[#b5655d]">→</span>
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-5 pb-20 sm:px-10">
        <section className="mx-auto max-w-[680px] py-12 text-center sm:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#b45e59]">O seu momento de cuidado</p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Beleza em cada detalhe
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-[#765f55]">
            No Jana Studio Beauty, cada atendimento é pensado com atenção, técnica e carinho para valorizar a beleza das suas mãos.
          </p>
        </section>

        <section id="servicos" className="scroll-mt-12 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#b45e59]">Especialidades</p>
          <h2 className="mt-2 text-3xl font-black" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Escolha o seu cuidado</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {services.map((service, index) => (
              <article key={service.name} className="flex items-center gap-4 rounded-3xl border border-[#ead3ca] bg-[#fffaf6] p-4 shadow-[0_10px_30px_rgba(88,55,42,.05)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f1d8d2] text-sm font-black text-[#9c4f4b]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>
                  <strong className="block text-base">{service.name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-[#896f64]">{service.detail}</span>
                </span>
              </article>
            ))}
          </div>
          <button type="button" className="mt-7 w-full rounded-full bg-[#b45e59] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(180,94,89,.25)]" title="Consultar horários disponíveis">
            Ver horários disponíveis
          </button>
        </section>

        <section className="py-12">
          <div className="overflow-hidden rounded-[2rem] bg-[#2d211d] text-white shadow-[0_20px_50px_rgba(61,38,28,.16)]">
            <div className="relative aspect-[4/5] sm:aspect-[16/10]">
              <Image
                src="/showcase/jana-studio-beauty/services.jpeg"
                alt="Jana Studio Beauty e os serviços disponíveis"
                fill
                sizes="(max-width: 1100px) 100vw, 1100px"
                className="object-cover"
              />
            </div>
            <div className="p-6 text-center sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[.22em] text-[#e8b7ad]">Jana Studio Beauty</p>
              <h2 className="mt-2 text-2xl font-black">Pronta para cuidar de si?</h2>
              <p className="mt-2 text-sm text-white/70">Paços de Ferreira · atendimento por marcação</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
