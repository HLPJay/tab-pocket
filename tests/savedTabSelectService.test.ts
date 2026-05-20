import { describe, it, expect } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SavedSession } from '../src/domain/sessionTypes'
import { selectCapturedTabsByNormalizedUrl } from '../src/services/savedTabSelectService'

const makeTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
  id: 'tab-1',
  url: 'https://example.com/',
  normalizedUrl: 'https://example.com/',
  title: 'Example',
  domain: 'example.com',
  capturedAt: 1000,
  updatedAt: 1000,
  openCount: 0,
  status: 'inbox',
  tags: [],
  ...overrides,
})

const makeSession = (overrides: Partial<SavedSession> = {}): SavedSession => ({
  id: 'session-1',
  name: 'Test',
  tabIds: ['tab-1'],
  capturedAt: 1000,
  updatedAt: 1000,
  status: 'active',
  ...overrides,
})

describe('selectCapturedTabsByNormalizedUrl', () => {
  it('returns empty map for empty tabs array', () => {
    const result = selectCapturedTabsByNormalizedUrl([], {})
    expect(result.size).toBe(0)
  })

  it('returns canonical entry for a single non-deleted tab', () => {
    const tab = makeTab()
    const result = selectCapturedTabsByNormalizedUrl([tab], {})
    expect(result.get('https://example.com/')).toBe(tab)
  })

  it('excludes deleted tabs', () => {
    const tab = makeTab({ status: 'deleted' })
    const result = selectCapturedTabsByNormalizedUrl([tab], {})
    expect(result.size).toBe(0)
  })

  it('excludes tabs whose sessionId points to a deleted session', () => {
    const sessions = { 'session-1': makeSession({ status: 'deleted' }) }
    const tab = makeTab({ sessionId: 'session-1' })
    const result = selectCapturedTabsByNormalizedUrl([tab], sessions)
    expect(result.size).toBe(0)
  })

  it('excludes tabs whose sessionId points to a missing session', () => {
    const tab = makeTab({ sessionId: 'nonexistent' })
    const result = selectCapturedTabsByNormalizedUrl([tab], {})
    expect(result.size).toBe(0)
  })

  it('for duplicate normalizedUrls picks the tab with higher updatedAt', () => {
    const older = makeTab({ id: 'old', updatedAt: 100, capturedAt: 100 })
    const newer = makeTab({ id: 'new', updatedAt: 200, capturedAt: 50 })
    const result = selectCapturedTabsByNormalizedUrl([older, newer], {})
    expect(result.get('https://example.com/')?.id).toBe('new')
  })

  it('on tied updatedAt picks the tab with higher capturedAt', () => {
    const a = makeTab({ id: 'a', updatedAt: 100, capturedAt: 50 })
    const b = makeTab({ id: 'b', updatedAt: 100, capturedAt: 200 })
    const result = selectCapturedTabsByNormalizedUrl([a, b], {})
    expect(result.get('https://example.com/')?.id).toBe('b')
  })

  it('multiple different normalizedUrls each get their own entry', () => {
    const tabA = makeTab({ id: 'a', normalizedUrl: 'https://a.com/' })
    const tabB = makeTab({ id: 'b', normalizedUrl: 'https://b.com/' })
    const result = selectCapturedTabsByNormalizedUrl([tabA, tabB], {})
    expect(result.get('https://a.com/')?.id).toBe('a')
    expect(result.get('https://b.com/')?.id).toBe('b')
    expect(result.size).toBe(2)
  })
})
