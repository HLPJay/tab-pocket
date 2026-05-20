import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreState } from '../src/domain/storeTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SavedSession } from '../src/domain/sessionTypes'

vi.mock('../src/repositories/storageRepository', () => {
  const store: { state: StoreState } = { state: { version: 1, tabs: {}, sessions: {} } }
  return {
    getStore: vi.fn(async () => JSON.parse(JSON.stringify(store.state))),
    saveStore: vi.fn(async (s: StoreState) => { store.state = s }),
  }
})

vi.mock('../src/chrome/chromeTabsClient', () => ({
  closeTab: vi.fn(),
}))

import { deleteSessionAndTabs } from '../src/services/sessionDeleteService'
import { getStore, saveStore } from '../src/repositories/storageRepository'
import { closeTab } from '../src/chrome/chromeTabsClient'

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

function setStore(state: Partial<StoreState>) {
  vi.mocked(getStore).mockResolvedValue({
    version: 1,
    tabs: {},
    sessions: {},
    ...state,
  })
  vi.mocked(saveStore).mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('deleteSessionAndTabs', () => {
  it('sets session.status = deleted', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await deleteSessionAndTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].status).toBe('deleted')
  })

  it('sets session.deletedAt', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await deleteSessionAndTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].deletedAt).toBeGreaterThan(0)
  })

  it('updates session.updatedAt', async () => {
    setStore({
      tabs: { 'tab-1': makeTab({ updatedAt: 1 }) },
      sessions: { 'session-1': makeSession({ updatedAt: 1 }) },
    })
    await deleteSessionAndTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].updatedAt).toBeGreaterThan(1)
  })

  it('soft-deletes all tabIds in the session that still belong to it', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', sessionId: 'session-1' }),
        'tab-2': makeTab({ id: 'tab-2', url: 'https://b.com', normalizedUrl: 'https://b.com/', sessionId: 'session-1' }),
      },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1', 'tab-2'] }) },
    })
    await deleteSessionAndTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].status).toBe('deleted')
    expect(saved.tabs['tab-2'].status).toBe('deleted')
  })

  it('does NOT affect tabs not belonging to the session', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1' }),
        'tab-other': makeTab({ id: 'tab-other', url: 'https://other.com', normalizedUrl: 'https://other.com/' }),
      },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1'] }) },
    })
    await deleteSessionAndTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-other'].status).toBe('inbox')
  })

  it('skips missing tabId without throwing', async () => {
    setStore({
      tabs: {},
      sessions: { 'session-1': makeSession({ tabIds: ['missing-tab'] }) },
    })
    await expect(deleteSessionAndTabs('session-1')).resolves.not.toThrow()
  })

  it('throws when session does not exist', async () => {
    setStore({ tabs: {}, sessions: {} })
    await expect(deleteSessionAndTabs('nonexistent')).rejects.toThrow('找不到 Session')
  })

  it('does NOT call closeTab', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await deleteSessionAndTabs('session-1')
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('calls getStore once and saveStore once', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await deleteSessionAndTabs('session-1')
    expect(getStore).toHaveBeenCalledOnce()
    expect(saveStore).toHaveBeenCalledOnce()
  })

  it('does NOT delete a tab that has been transferred to another session', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', sessionId: 'session-b' }),
      },
      sessions: {
        'session-a': makeSession({ id: 'session-a', tabIds: ['tab-1'] }),
        'session-b': makeSession({ id: 'session-b', tabIds: ['tab-1'] }),
      },
    })
    await deleteSessionAndTabs('session-a')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-a'].status).toBe('deleted')
    expect(saved.tabs['tab-1'].status).toBe('inbox')
    expect(saved.tabs['tab-1'].sessionId).toBe('session-b')
  })

  it('only deletes tabs still owned by the deleted session', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', sessionId: 'session-a' }),
        'tab-2': makeTab({ id: 'tab-2', url: 'https://b.com', normalizedUrl: 'https://b.com/', sessionId: 'session-b' }),
      },
      sessions: {
        'session-a': makeSession({ id: 'session-a', tabIds: ['tab-1', 'tab-2'] }),
        'session-b': makeSession({ id: 'session-b', tabIds: ['tab-2'] }),
      },
    })
    await deleteSessionAndTabs('session-a')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].status).toBe('deleted')
    expect(saved.tabs['tab-2'].status).toBe('inbox')
  })

  it('does NOT delete a tab with no sessionId listed in a session tabIds', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', sessionId: undefined }),
      },
      sessions: {
        'session-a': makeSession({ id: 'session-a', tabIds: ['tab-1'] }),
      },
    })
    await deleteSessionAndTabs('session-a')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].status).toBe('inbox')
  })
})
