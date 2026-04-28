'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Logo } from '@/components/ui/Logo'
import { Particles } from '@/components/ui/Particles'

const BUSINESS_TYPES = [
  { emoji: '✂️', label: 'Barbearia / Salão' },
  { emoji: '🌿', label: 'Spa & Estética' },
  { emoji: '🏥', label: 'Saúde & Clínicas' },
  { emoji: '💪', label: 'Coaching & Fitness' },
  { emoji: '📚', label: 'Aulas & Tutorias' },
  { emoji: '🐾', label: 'Veterinárias' },
]

const FEATURES = [
  { emoji: '📅', title: 'Agenda 24/7', desc: 'Os teus clientes marcam quando quiserem, sem telefonar.' },
  { emoji: '👥', title: 'Multi-equipa', desc: 'Até 5 profissionais com agendas independentes.' },
  { emoji: '⭐', title: 'Avaliações', desc: 'Recolhe reseñas automaticamente após cada marcação.' },
  { emoji: '📊', title: 'Finanças', desc: 'Receitas, despesas e relatórios num só lugar.' },
  { emoji: '🖼️', title: 'Galeria de fotos', desc: 'Mostra o teu espaço e trabalhos ao cliente.' },
  { emoji: '🔗', title: 'Link público', desc: 'URL personalizado para partilhar nas redes sociais.' },
]

const YEARLY = 0.833

export default function HomePage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-x-hidden">
      {/* Fondo #3: partículas flotantes */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse at center, #052e1640 0%, #09090b 70%)' }}
      >
        <Particles count={22} />
      </div>

      <div className="relative">
        {/* Nav */}
        <nav className="px-5 py-5 flex items-center justify-between max-w-7xl mx-auto">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-7 text-sm text-zinc-400">
            <a className="hover:text-white transition cursor-pointer">Funcionalidades</a>
            <a className="hover:text-white transition cursor-pointer">Preços</a>
            <a className="hover:text-white transition cursor-pointer">Contacto</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white px-3 py-2 transition">
              Iniciar sessão
            </Link>
            <Link
              href="/register"
              className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition"
            >
              Experimentar grátis
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-5 pt-12 pb-20 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400 mb-6">
            <span className="text-emerald-400">✦</span>
            <span>30 dias grátis · Sem cartão de crédito</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-5 leading-[1.05]"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Agenda inteligente para<br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
              o teu negócio.
            </span>
          </h1>
          <p className="text-base md:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Gere marcações, clientes e finanças num só lugar. Os teus clientes marcam online, tu focas-te no que importa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="group bg-emerald-500 text-zinc-950 px-7 py-3.5 rounded-xl font-semibold hover:bg-emerald-400 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Começar grátis
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/login"
              className="text-zinc-300 hover:text-white px-7 py-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        {/* Business types */}
        <section className="px-5 pb-16 max-w-5xl mx-auto">
          <p className="text-center text-xs text-zinc-500 uppercase tracking-[0.2em] mb-6">— Para todo tipo de negócios —</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {BUSINESS_TYPES.map((bt) => (
              <div key={bt.label} className="p-4 bg-zinc-900/40 backdrop-blur border border-zinc-800 rounded-2xl hover:border-emerald-500/30 transition text-center">
                <div className="text-2xl mb-2">{bt.emoji}</div>
                <div className="text-[10px] sm:text-xs text-zinc-300 font-medium">{bt.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-16 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-medium text-emerald-400 mb-3 tracking-[0.2em] uppercase">— Funcionalidades</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Tudo o que precisas.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="group p-6 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl hover:border-emerald-500/40 transition-all">
                <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition text-2xl">
                  {f.emoji}
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="px-5 py-16 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-xs font-medium text-emerald-400 mb-3 tracking-[0.2em] uppercase">— Preços</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Começa com 30 dias grátis.
            </h2>
            <p className="text-zinc-400 text-sm">Sem cartão. Cancela quando quiseres.</p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${billing === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${billing === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              Anual
              <span className="text-[10px] bg-emerald-500 text-zinc-950 px-1.5 py-0.5 rounded font-bold">-2 meses grátis</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* BÁSICO */}
            <div className="p-7 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-2xl">
              <div className="text-sm font-medium text-zinc-400 mb-2">Básico</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '20,99€' : `${(20.99 * YEARLY).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">/mês</span>
              </div>
              {billing === 'yearly' ? <div className="text-[10px] text-emerald-400 mb-5">≈ 209,90€/ano</div> : <div className="h-4 mb-5" />}
              <Link href="/register" className="block w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-semibold mb-6 transition text-sm text-center">
                Começar grátis
              </Link>
              <ul className="space-y-2.5 text-xs">
                {['1 colaborador', 'Agenda online ilimitada', 'Lembretes por email', 'Galeria 5 fotos', 'Avaliações', 'Suporte por email'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PLUS */}
            <div className="relative p-7 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-2 border-emerald-500/40 rounded-2xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">
                MAIS POPULAR
              </div>
              <div className="text-sm font-medium text-emerald-400 mb-2">Plus</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '25,99€' : `${(25.99 * YEARLY).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">/mês</span>
              </div>
              {billing === 'yearly' ? <div className="text-[10px] text-emerald-400 mb-5">≈ 259,90€/ano</div> : <div className="h-4 mb-5" />}
              <Link href="/register" className="block w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl font-semibold mb-6 transition text-sm text-center">
                Começar grátis
              </Link>
              <ul className="space-y-2.5 text-xs">
                {['Até 5 colaboradores', 'Serviços ilimitados', 'WhatsApp 100 msg/mês', 'Galeria 20 fotos', 'Relatórios avançados', 'Suporte prioritário'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-200">
                    <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PRO */}
            <div className="relative p-7 bg-zinc-900/30 backdrop-blur border border-zinc-800 rounded-2xl opacity-80">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-700 text-zinc-300 text-[10px] font-bold px-3 py-1 rounded-full tracking-wider flex items-center gap-1">
                👑 EM BREVE
              </div>
              <div className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1.5">PRO 👑</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {billing === 'monthly' ? '39,99€' : `${(39.99 * YEARLY).toFixed(2).replace('.', ',')}€`}
                </span>
                <span className="text-zinc-500 text-xs">/mês</span>
              </div>
              {billing === 'yearly' ? <div className="text-[10px] text-amber-400 mb-5">≈ 399,90€/ano</div> : <div className="h-4 mb-5" />}
              <button disabled className="w-full py-2.5 bg-zinc-800 text-zinc-500 rounded-xl font-semibold mb-6 cursor-not-allowed text-sm flex items-center justify-center gap-2">
                🔒 Em breve
              </button>
              <ul className="space-y-2.5 text-xs">
                {['Colaboradores ilimitados', 'WhatsApp ilimitado', 'Chat 2-way WhatsApp', 'Galeria ilimitada', 'API + integrações', 'Suporte dedicado'].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-amber-400 flex-shrink-0 mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="border-t border-zinc-900 py-8 px-5 mt-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <span className="text-xs ml-2">© 2026 · turboagenda.pt</span>
            </div>
            <div className="flex gap-5 text-xs">
              <a className="hover:text-zinc-300 cursor-pointer">Privacidade</a>
              <a className="hover:text-zinc-300 cursor-pointer">Termos</a>
              <a className="hover:text-zinc-300 cursor-pointer">Contacto</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
