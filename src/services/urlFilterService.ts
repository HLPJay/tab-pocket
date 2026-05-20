const BLOCKED_PREFIXES = [
  'chrome://',
  'edge://',
  'about:',
  'chrome-extension://',
  'devtools://',
  'file://',
]

export function isCollectibleUrl(url: string): boolean {
  if (!url) return false
  try {
    const lower = url.toLowerCase()
    if (BLOCKED_PREFIXES.some((prefix) => lower.startsWith(prefix))) return false
    return lower.startsWith('http://') || lower.startsWith('https://')
  } catch {
    return false
  }
}

export function getDomainFromUrl(url: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}
