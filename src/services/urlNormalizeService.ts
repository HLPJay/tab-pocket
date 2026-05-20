const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
]

export function normalizeUrl(input: string): string {
  if (!input) return ''
  try {
    const url = new URL(input)
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param)
    }
    return url.toString()
  } catch {
    return input
  }
}
