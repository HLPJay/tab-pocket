import { describe, it, expect } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import { isTabCurrentMemberOfSession } from '../src/services/sessionMembershipService'

const makeTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
  id: 'tab-1',
  url: 'https://example.com',
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

describe('isTabCurrentMemberOfSession', () => {
  it('returns false for undefined tab', () => {
    expect(isTabCurrentMemberOfSession(undefined, 'session-1')).toBe(false)
  })

  it('returns false for deleted tabs', () => {
    expect(isTabCurrentMemberOfSession(makeTab({ status: 'deleted' }), 'session-1')).toBe(false)
  })

  it('returns false for missing sessionId', () => {
    expect(isTabCurrentMemberOfSession(makeTab(), 'session-1')).toBe(false)
  })

  it('returns false when tab.sessionId does not match', () => {
    expect(isTabCurrentMemberOfSession(makeTab({ sessionId: 'session-2' }), 'session-1')).toBe(false)
  })

  it('returns true when tab belongs to the current session and is not deleted', () => {
    expect(isTabCurrentMemberOfSession(makeTab({ sessionId: 'session-1' }), 'session-1')).toBe(true)
  })
})
