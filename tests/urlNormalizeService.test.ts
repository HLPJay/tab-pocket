import { describe, it, expect } from 'vitest'
import { normalizeUrl } from '../src/services/urlNormalizeService'

describe('normalizeUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('')
  })

  it('returns unchanged URL when no tracking params', () => {
    expect(normalizeUrl('https://example.com/page')).toBe('https://example.com/page')
  })

  it('strips utm_source', () => {
    const result = normalizeUrl('https://example.com/?utm_source=newsletter')
    expect(result).not.toContain('utm_source')
  })

  it('strips utm_medium', () => {
    const result = normalizeUrl('https://example.com/?utm_medium=email')
    expect(result).not.toContain('utm_medium')
  })

  it('strips utm_campaign', () => {
    const result = normalizeUrl('https://example.com/?utm_campaign=spring')
    expect(result).not.toContain('utm_campaign')
  })

  it('strips utm_term', () => {
    const result = normalizeUrl('https://example.com/?utm_term=keyword')
    expect(result).not.toContain('utm_term')
  })

  it('strips utm_content', () => {
    const result = normalizeUrl('https://example.com/?utm_content=banner')
    expect(result).not.toContain('utm_content')
  })

  it('strips fbclid', () => {
    const result = normalizeUrl('https://example.com/?fbclid=abc123')
    expect(result).not.toContain('fbclid')
  })

  it('strips gclid', () => {
    const result = normalizeUrl('https://example.com/?gclid=xyz')
    expect(result).not.toContain('gclid')
  })

  it('preserves non-tracking query params', () => {
    const result = normalizeUrl('https://example.com/?q=hello&utm_source=x')
    expect(result).toContain('q=hello')
    expect(result).not.toContain('utm_source')
  })

  it('strips all tracking params at once', () => {
    const url = 'https://example.com/?utm_source=a&utm_medium=b&fbclid=c&q=keep'
    const result = normalizeUrl(url)
    expect(result).not.toContain('utm_source')
    expect(result).not.toContain('utm_medium')
    expect(result).not.toContain('fbclid')
    expect(result).toContain('q=keep')
  })

  it('preserves hash fragment', () => {
    const result = normalizeUrl('https://example.com/page#section')
    expect(result).toContain('#section')
  })

  it('returns original string for invalid URL without throwing', () => {
    expect(() => normalizeUrl('not-a-url')).not.toThrow()
    expect(normalizeUrl('not-a-url')).toBe('not-a-url')
  })

  it('does not change http to https', () => {
    const result = normalizeUrl('http://example.com/')
    expect(result.startsWith('http://')).toBe(true)
  })

  it('two URLs differing only in tracking params are equal after normalization', () => {
    const a = normalizeUrl('https://example.com/page?utm_source=x')
    const b = normalizeUrl('https://example.com/page')
    expect(a).toBe(b)
  })

  it('two different content pages are not collapsed', () => {
    const a = normalizeUrl('https://example.com/page1')
    const b = normalizeUrl('https://example.com/page2')
    expect(a).not.toBe(b)
  })
})
