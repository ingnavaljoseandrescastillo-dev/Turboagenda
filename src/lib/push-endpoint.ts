export function isAllowedPushEndpoint(value: string): boolean {
  try {
    if (value.length > 4096) return false
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) return false
    const host = url.hostname
    return host === 'fcm.googleapis.com' || host === 'web.push.apple.com' ||
      host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') ||
      host.endsWith('.notify.windows.com')
  } catch { return false }
}
