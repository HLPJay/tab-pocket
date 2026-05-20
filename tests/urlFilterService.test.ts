import { describe, it, expect } from 'vitest'
import { isCollectibleUrl, getDomainFromUrl } from '../src/services/urlFilterService'

describe('isCollectibleUrl', () => {
  it('allows https URLs', () => {
    expect(isCollectibleUrl('https://example.com')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isCollectibleUrl('http://example.com')).toBe(true)
  })

  it('blocks chrome:// URLs', () => {
    expect(isCollectibleUrl('chrome://extensions')).toBe(false)
  })

  it('blocks edge:// URLs', () => {
    expect(isCollectibleUrl('edge://settings')).toBe(false)
  })

  it('blocks about: URLs', () => {
    expect(isCollectibleUrl('about:blank')).toBe(false)
  })

  it('blocks chrome-extension:// URLs', () => {
    expect(isCollectibleUrl('chrome-extension://abc/index.html')).toBe(false)
  })

  it('blocks devtools:// URLs', () => {
    expect(isCollectibleUrl('devtools://devtools/bundled/devtools_app.html')).toBe(false)
  })

  it('blocks file:// URLs', () => {
    expect(isCollectibleUrl('file:///Users/test/a.html')).toBe(false)
  })

  it('blocks empty string', () => {
    expect(isCollectibleUrl('')).toBe(false)
  })

  it('blocks invalid URLs', () => {
    expect(isCollectibleUrl('not-a-url')).toBe(false)
  })
})

describe('getDomainFromUrl', () => {
  it('returns hostname for valid https URL', () => {
    expect(getDomainFromUrl('https://example.com/a')).toBe('example.com')
  })

  it('returns empty string for invalid URL without throwing', () => {
    expect(() => getDomainFromUrl('not-a-url')).not.toThrow()
    expect(getDomainFromUrl('not-a-url')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(getDomainFromUrl('')).toBe('')
  })
})
