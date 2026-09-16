export function isTrustedMutation(method: string, url: string, headers: Headers) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return true
  if (headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = headers.get('origin')
  if (!origin) return !headers.has('cookie')
  try {
    return origin === new URL(url).origin
  } catch {
    return false
  }
}
