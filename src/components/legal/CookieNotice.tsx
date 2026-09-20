'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

const key = 'ta_cookie_notice_v1'
const event = 'ta-cookie-notice-change'
const copy = {
  pt: { title: 'Cookies essenciais', body: 'Usamos cookies de sessao e armazenamento tecnico para o login, seguranca e preferencias. Nao usamos cookies de publicidade ou analitica nesta aplicacao.', policy: 'Politica de cookies', close: 'Entendido' },
  es: { title: 'Cookies esenciales', body: 'Usamos cookies de sesion y almacenamiento tecnico para el acceso, la seguridad y las preferencias. No usamos cookies de publicidad ni analitica en esta aplicacion.', policy: 'Politica de cookies', close: 'Entendido' },
  en: { title: 'Essential cookies', body: 'We use session cookies and technical storage for sign-in, security and preferences. We do not use advertising or analytics cookies in this application.', policy: 'Cookie policy', close: 'Understood' },
}

let dismissedInMemory = false
function subscribe(callback: () => void) {
  window.addEventListener(event, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(event, callback)
    window.removeEventListener('storage', callback)
  }
}
function isDismissed() {
  try { return dismissedInMemory || localStorage.getItem(key) === 'acknowledged' }
  catch { return dismissedInMemory }
}

export function CookieNotice() {
  const { locale } = useLanguage()
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true)
  const text = copy[locale]
  if (dismissed) return null

  function dismiss() {
    dismissedInMemory = true
    try { localStorage.setItem(key, 'acknowledged') } catch { /* Storage may be disabled. */ }
    window.dispatchEvent(new Event(event))
  }

  return (
    <aside
      aria-labelledby="cookie-notice-title"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-3 text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur sm:p-4"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 id="cookie-notice-title" className="text-sm font-semibold">{text.title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400 sm:text-sm">{text.body}</p>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <Link href="/cookies" className="text-xs text-emerald-400 underline underline-offset-4 sm:text-sm">{text.policy}</Link>
          <button type="button" onClick={dismiss} className="min-h-10 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{text.close}</button>
        </div>
      </div>
    </aside>
  )
}
