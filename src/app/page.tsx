'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Particles } from '@/components/ui/Particles'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomePage() {
  const { t } = useLanguage()
  const p = t.pricing
  const basePlanSalesHref = `https://wa.me/351938037175?text=${encodeURIComponent(
    'Olá, quero ativar o Plano Base do TurboAgenda para o meu negócio.',
  )}`
  const proWaitlistHref = `https://wa.me/351938037175?text=${encodeURIComponent(
    'Olá, quero entrar na lista de espera do Plano Pro do TurboAgenda.',
  )}`

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at center, #052e1640 0%, #09090b 70%)' }}
      >
        <Particles count={22} />
      </div>

      <div className="relative">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Logo size="md" />
          <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
            <a className="cursor-pointer transition hover:text-white">{t.nav.features}</a>
            <a className="cursor-pointer transition hover:text-white">{t.nav.pricing}</a>
            <a className="cursor-pointer transition hover:text-white">{t.nav.contact}</a>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link href="/login" className="px-3 py-2 text-sm text-zinc-400 transition hover:text-white">
              {t.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              {t.nav.trial}
            </Link>
          </div>
        </nav>

        <section className="mx-auto max-w-5xl px-5 pb-20 pt-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-1.5 text-xs text-zinc-400 backdrop-blur">
            <span className="text-emerald-400">*</span>
            <span>{t.hero.badge}</span>
          </div>
          <h1
            className="mb-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {t.hero.title1}
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
              {t.hero.title2}
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-xl">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              {t.hero.cta}
              <span className="transition-transform group-hover:translate-x-1">-&gt;</span>
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-zinc-800 px-7 py-3.5 text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              {t.hero.hasAccount}
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-16">
          <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">{t.businessTypes.label}</p>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
            {t.businessTypes.types.map((businessType) => (
              <div
                key={businessType.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-center transition hover:border-emerald-500/30"
              >
                <div className="mb-2 text-2xl">{businessType.emoji}</div>
                <div className="text-[10px] font-medium text-zinc-300 sm:text-xs">{businessType.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="mb-10 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">{t.features.label}</div>
            <h2
              className="text-3xl font-bold tracking-tight md:text-5xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {t.features.title}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {t.features.items.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur transition-all hover:border-emerald-500/40"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl transition group-hover:bg-emerald-500/20">
                  {feature.emoji}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-8 text-center">
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">{p.label}</div>
            <h2
              className="mb-3 text-3xl font-bold tracking-tight md:text-5xl"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              {p.title}
            </h2>
            <p className="text-sm text-zinc-400">{p.subtitle}</p>
            <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-200">
              <span>30 dias gratis</span>
              <span className="hidden text-emerald-500/60 sm:inline">•</span>
              <span>Primeiro mes a 12,60 EUR</span>
              <span className="hidden text-emerald-500/60 sm:inline">•</span>
              <span>Depois 18 EUR por mes</span>
            </div>
          </div>

          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-7 backdrop-blur">
              <div className="mb-2 text-sm font-medium text-zinc-400">{p.basic.name}</div>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  18 EUR
                </span>
                <span className="text-xs text-zinc-500">/ mes</span>
              </div>
              <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                30 dias gratis. Primeiro pagamento com 30% de desconto.
              </div>
              <a
                href={basePlanSalesHref}
                rel="noreferrer"
                target="_blank"
                className="mb-2 block w-full rounded-xl bg-zinc-800 py-2.5 text-center text-sm font-semibold transition hover:bg-zinc-700"
              >
                Falar no WhatsApp
              </a>
              <p className="mb-6 text-center text-xs leading-5 text-zinc-500">
                Ativacao manual durante a beta comercial.
              </p>
              <ul className="space-y-2.5 text-xs">
                {p.basic.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-zinc-300">
                    <span className="mt-0.5 flex-shrink-0 text-emerald-400">+</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/30 p-7 backdrop-blur">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-700 px-3 py-1 text-[10px] font-bold tracking-wider text-zinc-300">
                {p.comingSoon}
              </div>
              <div className="mb-2 text-sm font-medium text-amber-400">Plan Pro</div>
              <div className="mb-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  Em breve
                </span>
              </div>
              <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                Estamos a preparar funcionalidades premium para negocios que quieran crescer com mais automatizacao,
                controlo e operacao.
              </div>
              <a
                href={proWaitlistHref}
                rel="noreferrer"
                target="_blank"
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700"
              >
                Quero entrar na lista
              </a>
              <p className="mb-6 text-center text-xs leading-5 text-zinc-500">
                Falamos contigo quando abrirmos o plano premium.
              </p>
              <ul className="space-y-2.5 text-xs">
                {p.pro.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-zinc-300">
                    <span className="mt-0.5 flex-shrink-0 text-amber-400">+</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-zinc-900 px-5 py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-zinc-500 md:flex-row">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="ml-2 text-xs">2026 · turboagenda.pt</span>
            </div>
            <div className="flex gap-5 text-xs">
              <Link href="/privacidade" className="hover:text-zinc-300">{t.footer.privacy}</Link>
              <Link href="/termos" className="hover:text-zinc-300">{t.footer.terms}</Link>
              <a className="cursor-pointer hover:text-zinc-300">{t.footer.contact}</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
