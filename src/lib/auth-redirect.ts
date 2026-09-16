export function getAuthRedirectPath(requested: string | null): string {
  if (requested === '/reset-password') return requested
  if (!requested || /[\\\x00-\x20]/.test(requested)) return '/dashboard'
  try {
    const base = new URL('https://turboagenda.pt')
    const target = new URL(requested, base)
    if (target.origin !== base.origin) return '/dashboard'
    if (target.pathname !== '/dashboard' && !target.pathname.startsWith('/dashboard/')) return '/dashboard'
    return `${target.pathname}${target.search}`
  } catch {
    return '/dashboard'
  }
}
