import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

type LegalSection = {
  title: string
  body: string[]
}

interface LegalPageProps {
  title: string
  subtitle: string
  updatedAt: string
  sections: LegalSection[]
}

export function LegalPage({ title, subtitle, updatedAt, sections }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
          <Link href="/" aria-label="TurboAgenda">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="text-sm text-zinc-400 transition hover:text-zinc-100">
            Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="mb-10 border-b border-zinc-900 pb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
            Atualizado em {updatedAt}
          </p>
          <h1
            className="mb-4 text-4xl font-bold tracking-tight text-zinc-50 md:text-5xl"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-400">{subtitle}</p>
        </div>

        <div className="space-y-9">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-semibold text-zinc-100">{section.title}</h2>
              <div className="space-y-3 text-sm leading-7 text-zinc-400">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
