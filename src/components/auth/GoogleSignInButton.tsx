'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/Button'

const copy = {
  pt: { button: 'Continuar com Google', accept: 'Li e aceito os', terms: 'Termos', and: 'e li a', privacy: 'Politica de Privacidade', error: 'Nao foi possivel iniciar sessao com Google. Tente novamente.' },
  es: { button: 'Continuar con Google', accept: 'He leido y acepto los', terms: 'Terminos', and: 'y he leido la', privacy: 'Politica de Privacidad', error: 'No se pudo iniciar sesion con Google. Intentalo de nuevo.' },
  en: { button: 'Continue with Google', accept: 'I have read and accept the', terms: 'Terms', and: 'and have read the', privacy: 'Privacy Policy', error: 'Could not sign in with Google. Please try again.' },
}

export function GoogleSignInButton({ disabled = false, acceptedTerms }: { disabled?: boolean; acceptedTerms?: boolean }) {
  const { locale } = useLanguage()
  const text = copy[locale]
  const [ownAcceptance, setAccepted] = useState(false)
  const accepted = acceptedTerms ?? ownAcceptance
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    if (!accepted || loading) return
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (authError) throw authError
    } catch {
      setError(text.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 border-t border-zinc-800 pt-4">
      {acceptedTerms === undefined && <label className="flex items-start gap-2 text-xs leading-5 text-zinc-400">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} disabled={loading} className="mt-1 h-4 w-4 shrink-0 accent-emerald-500" />
        <span>{text.accept} <Link href="/termos" className="text-zinc-200 underline">{text.terms}</Link> {text.and} <Link href="/privacidade" className="text-zinc-200 underline">{text.privacy}</Link>.</span>
      </label>}
      <Button type="button" variant="secondary" className="w-full min-h-11" disabled={disabled || !accepted} loading={loading} onClick={signIn}>
        {text.button}
      </Button>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
