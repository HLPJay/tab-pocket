import { describe, it, expect } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SavedSession } from '../src/domain/sessionTypes'
import {
  isActiveSession,
  isEffectiveCapturedTab,
  isUngroupedInboxTab,
  isOrphanedSessionTab,
} from '../src/services/savedTabVisibilityService'

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

const makeSession = (overrides: Partial<SavedSession> = {}): SavedSession => ({
  id: 'session-1',
  name: 'Test',
  tabIds: ['tab-1'],
  capturedAt: 1000,
  updatedAt: 1000,
  status: 'active',
  ...overrides,
})

const activeSessions: Record<string, SavedSession> = {
  'session-1': makeSession(),
}

const deletedSessions: Record<string, SavedSession> = {
  'session-1': makeSession({ status: 'deleted' }),
}

describe('isActiveSession', () => {
  it('returns false for undefined sessionId', () => {
    expect(isActiveSession(undefined, activeSessions)).toBe(false)
  })

  it('returns false for missing session', () => {
    expect(isActiveSession('missing', activeSessions)).toBe(false)
  })

  it('returns false for deleted session', () => {
    expect(isActiveSession('session-1', deletedSessions)).toBe(false)
  })

  it('returns true for active session', () => {
    expect(isActiveSession('session-1', activeSessions)).toBe(true)
  })
})

describe('isEffectiveCapturedTab', () => {
  it('non-deleted tab with no sessionId is effective captured', () => {
    expect(isEffectiveCapturedTab(makeTab(), {})).toBe(true)
  })

  it('deleted tab is NOT effective captured', () => {
    expect(isEffectiveCapturedTab(makeTab({ status: 'deleted' }), {})).toBe(false)
  })

  it('tab with active sessionId is effective captured', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isEffectiveCapturedTab(tab, activeSessions)).toBe(true)
  })

  it('tab with deleted sessionId is NOT effective captured', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isEffectiveCapturedTab(tab, deletedSessions)).toBe(false)
  })

  it('tab with missing sessionId is NOT effective captured', () => {
    const tab = makeTab({ sessionId: 'nonexistent' })
    expect(isEffectiveCapturedTab(tab, activeSessions)).toBe(false)
  })
})

describe('isUngroupedInboxTab', () => {
  it('inbox tab with no sessionId is ungrouped', () => {
    expect(isUngroupedInboxTab(makeTab(), {})).toBe(true)
  })

  it('inbox tab with active sessionId is NOT ungrouped', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isUngroupedInboxTab(tab, activeSessions)).toBe(false)
  })

  it('inbox tab with deleted sessionId is NOT ungrouped', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isUngroupedInboxTab(tab, deletedSessions)).toBe(false)
  })

  it('inbox tab with missing sessionId is NOT ungrouped', () => {
    const tab = makeTab({ sessionId: 'nonexistent' })
    expect(isUngroupedInboxTab(tab, {})).toBe(false)
  })

  it('deleted tab is NOT ungrouped', () => {
    expect(isUngroupedInboxTab(makeTab({ status: 'deleted' }), {})).toBe(false)
  })

  it('archived tab is NOT ungrouped', () => {
    expect(isUngroupedInboxTab(makeTab({ status: 'archived' }), {})).toBe(false)
  })
})

describe('isOrphanedSessionTab', () => {
  it('tab with sessionId pointing to missing session is orphaned', () => {
    const tab = makeTab({ sessionId: 'nonexistent' })
    expect(isOrphanedSessionTab(tab, {})).toBe(true)
  })

  it('tab with sessionId pointing to deleted session is orphaned', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isOrphanedSessionTab(tab, deletedSessions)).toBe(true)
  })

  it('tab with active sessionId is NOT orphaned', () => {
    const tab = makeTab({ sessionId: 'session-1' })
    expect(isOrphanedSessionTab(tab, activeSessions)).toBe(false)
  })

  it('deleted tab is NOT considered orphaned (already deleted)', () => {
    const tab = makeTab({ status: 'deleted', sessionId: 'nonexistent' })
    expect(isOrphanedSessionTab(tab, {})).toBe(false)
  })

  it('tab with no sessionId is NOT orphaned', () => {
    expect(isOrphanedSessionTab(makeTab(), {})).toBe(false)
  })
})
