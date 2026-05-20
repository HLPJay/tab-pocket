import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SavedSession } from '../src/domain/sessionTypes'

// In-memory chrome.storage.local mock
const mockStore: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStore[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStore, items)
      }),
    },
  },
})

import {
  getStore,
  saveStore,
  listSavedTabs,
  upsertSavedTab,
  softDeleteSavedTab,
  markSavedTabOpened,
  listSavedSessions,
  upsertSavedSession,
  softDeleteSavedSession,
  restoreSavedTab,
  hardDeleteSavedTab,
  clearTrash,
  normalizeOrphanedSessionTabs,
} from '../src/repositories/storageRepository'

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
  name: 'Test Session',
  tabIds: ['tab-1'],
  capturedAt: 1000,
  updatedAt: 1000,
  status: 'active',
  ...overrides,
})

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
  vi.mocked(chrome.storage.local.get).mockClear()
  vi.mocked(chrome.storage.local.set).mockClear()
})

// ── getStore ──────────────────────────────────────────────────────────────────

describe('getStore', () => {
  it('returns default store with empty sessions when storage is empty', async () => {
    const store = await getStore()
    expect(store).toEqual({ version: 1, tabs: {}, sessions: {} })
  })

  it('returns default store when stored value is not an object', async () => {
    mockStore['tabPocketStore'] = null
    const store = await getStore()
    expect(store).toEqual({ version: 1, tabs: {}, sessions: {} })
  })

  it('backwards compat: old store without sessions field returns sessions: {}', async () => {
    mockStore['tabPocketStore'] = { version: 1, tabs: { 'tab-1': makeTab() } }
    const store = await getStore()
    expect(store.sessions).toEqual({})
    expect(store.tabs['tab-1']).toBeDefined()
  })
})

// ── saveStore ──────────────────────────────────────────────────────────────────

describe('saveStore', () => {
  it('writes the store including sessions to chrome.storage.local', async () => {
    const session = makeSession()
    const state = { version: 1 as const, tabs: {}, sessions: { 'session-1': session } }
    await saveStore(state)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ tabPocketStore: state })
  })
})

// ── Tab operations ────────────────────────────────────────────────────────────

describe('upsertSavedTab', () => {
  it('inserts a new tab', async () => {
    const tab = makeTab()
    await upsertSavedTab(tab)
    const store = await getStore()
    expect(store.tabs['tab-1']).toMatchObject({ id: 'tab-1' })
  })

  it('overwrites an existing tab', async () => {
    await upsertSavedTab(makeTab({ openCount: 0 }))
    await upsertSavedTab(makeTab({ openCount: 5 }))
    const store = await getStore()
    expect(store.tabs['tab-1'].openCount).toBe(5)
  })

  it('does not store body content, screenshots, or base64 favicon', async () => {
    await upsertSavedTab(makeTab())
    const stored = JSON.stringify(mockStore)
    expect(stored).not.toContain('base64')
    expect(stored).not.toContain('screenshot')
    expect(stored).not.toContain('bodyText')
  })
})

describe('listSavedTabs', () => {
  it('returns empty array for empty store', async () => {
    expect(await listSavedTabs()).toEqual([])
  })

  it('returns tabs sorted by capturedAt descending', async () => {
    await upsertSavedTab(makeTab({ id: 'a', capturedAt: 100 }))
    await upsertSavedTab(makeTab({ id: 'b', capturedAt: 300 }))
    await upsertSavedTab(makeTab({ id: 'c', capturedAt: 200 }))
    const tabs = await listSavedTabs()
    expect(tabs.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('softDeleteSavedTab', () => {
  it('sets status to deleted and records deletedAt and updatedAt', async () => {
    await upsertSavedTab(makeTab())
    const before = Date.now()
    await softDeleteSavedTab('tab-1')
    const after = Date.now()
    const store = await getStore()
    const tab = store.tabs['tab-1']
    expect(tab.status).toBe('deleted')
    expect(tab.deletedAt).toBeGreaterThanOrEqual(before)
    expect(tab.deletedAt).toBeLessThanOrEqual(after)
  })

  it('does nothing when id does not exist', async () => {
    await expect(softDeleteSavedTab('nonexistent')).resolves.toBeUndefined()
  })
})

describe('markSavedTabOpened', () => {
  it('increments openCount and sets lastOpenedAt', async () => {
    await upsertSavedTab(makeTab({ openCount: 2 }))
    const before = Date.now()
    await markSavedTabOpened('tab-1')
    const after = Date.now()
    const store = await getStore()
    const tab = store.tabs['tab-1']
    expect(tab.openCount).toBe(3)
    expect(tab.lastOpenedAt).toBeGreaterThanOrEqual(before)
    expect(tab.lastOpenedAt).toBeLessThanOrEqual(after)
  })
})

// ── Session operations ────────────────────────────────────────────────────────

describe('listSavedSessions', () => {
  it('returns empty array for empty store', async () => {
    expect(await listSavedSessions()).toEqual([])
  })

  it('returns sessions sorted by capturedAt descending', async () => {
    await upsertSavedSession(makeSession({ id: 'a', capturedAt: 100 }))
    await upsertSavedSession(makeSession({ id: 'b', capturedAt: 300 }))
    await upsertSavedSession(makeSession({ id: 'c', capturedAt: 200 }))
    const sessions = await listSavedSessions()
    expect(sessions.map((s) => s.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('upsertSavedSession', () => {
  it('inserts a new session', async () => {
    const session = makeSession()
    await upsertSavedSession(session)
    const store = await getStore()
    expect(store.sessions['session-1']).toMatchObject({ id: 'session-1', name: 'Test Session' })
  })

  it('updates an existing session', async () => {
    await upsertSavedSession(makeSession({ name: 'Old Name' }))
    await upsertSavedSession(makeSession({ name: 'New Name' }))
    const store = await getStore()
    expect(store.sessions['session-1'].name).toBe('New Name')
  })

  it('preserves note field on session', async () => {
    await upsertSavedSession(makeSession({ note: '这是备注' }))
    const store = await getStore()
    expect(store.sessions['session-1'].note).toBe('这是备注')
  })

  it('session without note field does not crash', async () => {
    await upsertSavedSession(makeSession())
    const store = await getStore()
    expect(store.sessions['session-1'].note).toBeUndefined()
  })
})

describe('softDeleteSavedSession', () => {
  it('sets status to deleted and records deletedAt and updatedAt', async () => {
    await upsertSavedSession(makeSession())
    const before = Date.now()
    await softDeleteSavedSession('session-1')
    const after = Date.now()
    const store = await getStore()
    const session = store.sessions['session-1']
    expect(session.status).toBe('deleted')
    expect(session.deletedAt).toBeGreaterThanOrEqual(before)
    expect(session.deletedAt).toBeLessThanOrEqual(after)
    expect(session.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('does not delete tabs when session is deleted', async () => {
    await upsertSavedTab(makeTab({ id: 'tab-1' }))
    await upsertSavedSession(makeSession({ tabIds: ['tab-1'] }))
    await softDeleteSavedSession('session-1')
    const store = await getStore()
    expect(store.tabs['tab-1']).toBeDefined()
    expect(store.tabs['tab-1'].status).toBe('inbox')
  })

  it('does nothing when session id does not exist', async () => {
    await expect(softDeleteSavedSession('nonexistent')).resolves.toBeUndefined()
  })
})

// ── restoreSavedTab ───────────────────────────────────────────────────────────

describe('restoreSavedTab', () => {
  it('restores a deleted tab to inbox', async () => {
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 5000 }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].status).toBe('inbox')
  })

  it('clears deletedAt on restore', async () => {
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 5000 }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].deletedAt).toBeUndefined()
  })

  it('updates updatedAt on restore', async () => {
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 1000, updatedAt: 1000 }))
    const before = Date.now()
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('preserves sessionId when referenced session is active', async () => {
    await upsertSavedSession(makeSession({ id: 'session-1', status: 'active' }))
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 1000, sessionId: 'session-1' }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].sessionId).toBe('session-1')
  })

  it('clears sessionId when referenced session is deleted', async () => {
    await upsertSavedSession(makeSession({ id: 'session-1', status: 'deleted', deletedAt: 1000 }))
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 1000, sessionId: 'session-1' }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].sessionId).toBeUndefined()
  })

  it('clears sessionId when referenced session does not exist', async () => {
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 1000, sessionId: 'ghost-session' }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].sessionId).toBeUndefined()
  })

  it('does nothing when tab does not exist', async () => {
    await expect(restoreSavedTab('nonexistent')).resolves.toBeUndefined()
  })

  it('does nothing when tab is not deleted', async () => {
    await upsertSavedTab(makeTab({ status: 'inbox' }))
    await restoreSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1'].status).toBe('inbox')
  })
})

// ── hardDeleteSavedTab ────────────────────────────────────────────────────────

describe('hardDeleteSavedTab', () => {
  it('removes a deleted tab from the store', async () => {
    await upsertSavedTab(makeTab({ status: 'deleted', deletedAt: 1000 }))
    await hardDeleteSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1']).toBeUndefined()
  })

  it('does not remove an inbox tab', async () => {
    await upsertSavedTab(makeTab({ status: 'inbox' }))
    await hardDeleteSavedTab('tab-1')
    const store = await getStore()
    expect(store.tabs['tab-1']).toBeDefined()
    expect(store.tabs['tab-1'].status).toBe('inbox')
  })

  it('does nothing when tab does not exist', async () => {
    await expect(hardDeleteSavedTab('nonexistent')).resolves.toBeUndefined()
  })
})

// ── clearTrash ────────────────────────────────────────────────────────────────

describe('clearTrash', () => {
  it('removes all deleted tabs', async () => {
    await upsertSavedTab(makeTab({ id: 'a', status: 'deleted', deletedAt: 1000 }))
    await upsertSavedTab(makeTab({ id: 'b', status: 'deleted', deletedAt: 2000 }))
    await clearTrash()
    const store = await getStore()
    expect(store.tabs['a']).toBeUndefined()
    expect(store.tabs['b']).toBeUndefined()
  })

  it('removes all deleted sessions', async () => {
    await upsertSavedSession(makeSession({ id: 'dead-session', status: 'deleted', deletedAt: 1000 }))
    await clearTrash()
    const store = await getStore()
    expect(store.sessions['dead-session']).toBeUndefined()
  })

  it('preserves inbox tabs', async () => {
    await upsertSavedTab(makeTab({ id: 'keep', status: 'inbox' }))
    await upsertSavedTab(makeTab({ id: 'gone', status: 'deleted', deletedAt: 1000 }))
    await clearTrash()
    const store = await getStore()
    expect(store.tabs['keep']).toBeDefined()
    expect(store.tabs['gone']).toBeUndefined()
  })

  it('preserves active sessions', async () => {
    await upsertSavedSession(makeSession({ id: 'live', status: 'active' }))
    await upsertSavedSession(makeSession({ id: 'dead', status: 'deleted', deletedAt: 1000 }))
    await clearTrash()
    const store = await getStore()
    expect(store.sessions['live']).toBeDefined()
    expect(store.sessions['dead']).toBeUndefined()
  })

  it('writes store exactly once', async () => {
    await upsertSavedTab(makeTab({ id: 'a', status: 'deleted', deletedAt: 1000 }))
    await upsertSavedTab(makeTab({ id: 'b', status: 'deleted', deletedAt: 2000 }))
    vi.mocked(chrome.storage.local.set).mockClear()
    await clearTrash()
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1)
  })
})

// ── normalizeOrphanedSessionTabs ──────────────────────────────────────────────

describe('normalizeOrphanedSessionTabs', () => {
  it('soft-deletes tab whose sessionId points to a missing session', async () => {
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'ghost-session', status: 'inbox' }))
    await normalizeOrphanedSessionTabs()
    const store = await getStore()
    expect(store.tabs['tab-1'].status).toBe('deleted')
  })

  it('soft-deletes tab whose sessionId points to a deleted session', async () => {
    await upsertSavedSession(makeSession({ id: 'session-1', status: 'deleted', deletedAt: 1000 }))
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'session-1', status: 'inbox' }))
    await normalizeOrphanedSessionTabs()
    const store = await getStore()
    expect(store.tabs['tab-1'].status).toBe('deleted')
  })

  it('preserves tab whose sessionId points to an active session', async () => {
    await upsertSavedSession(makeSession({ id: 'session-1', status: 'active' }))
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'session-1', status: 'inbox' }))
    await normalizeOrphanedSessionTabs()
    const store = await getStore()
    expect(store.tabs['tab-1'].status).toBe('inbox')
  })

  it('does not re-process already-deleted tabs', async () => {
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'ghost', status: 'deleted', deletedAt: 999 }))
    await normalizeOrphanedSessionTabs()
    const store = await getStore()
    expect(store.tabs['tab-1'].deletedAt).toBe(999)
  })

  it('does not call saveStore when no orphans exist', async () => {
    await upsertSavedSession(makeSession({ id: 'session-1', status: 'active' }))
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'session-1', status: 'inbox' }))
    vi.mocked(chrome.storage.local.set).mockClear()
    await normalizeOrphanedSessionTabs()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('calls saveStore exactly once when orphans exist', async () => {
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'ghost', status: 'inbox' }))
    await upsertSavedTab(makeTab({ id: 'tab-2', sessionId: 'ghost', status: 'inbox', url: 'https://b.com', normalizedUrl: 'https://b.com/' }))
    vi.mocked(chrome.storage.local.set).mockClear()
    await normalizeOrphanedSessionTabs()
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1)
  })

  it('does not hard-delete any tab', async () => {
    await upsertSavedTab(makeTab({ id: 'tab-1', sessionId: 'ghost', status: 'inbox' }))
    await normalizeOrphanedSessionTabs()
    const store = await getStore()
    expect(store.tabs['tab-1']).toBeDefined()
  })
})
