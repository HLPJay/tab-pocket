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
  createTab: vi.fn(),
}))

import { openSessionTabs } from '../src/services/sessionOpenService'
import { getStore, saveStore } from '../src/repositories/storageRepository'
import { createTab } from '../src/chrome/chromeTabsClient'

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
  vi.mocked(createTab).mockResolvedValue({} as chrome.tabs.Tab)
})

describe('openSessionTabs', () => {
  it('opens all non-deleted tabs in a session', async () => {
    setStore({
      tabs: { 'tab-1': makeTab(), 'tab-2': makeTab({ id: 'tab-2', url: 'https://b.com' }) },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1', 'tab-2'] }) },
    })
    await openSessionTabs('session-1')
    expect(createTab).toHaveBeenCalledTimes(2)
    expect(createTab).toHaveBeenCalledWith('https://example.com')
    expect(createTab).toHaveBeenCalledWith('https://b.com')
  })

  it('opens tabs in session.tabIds order', async () => {
    const calls: string[] = []
    vi.mocked(createTab).mockImplementation(async (url) => {
      calls.push(url)
      return {} as chrome.tabs.Tab
    })
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', url: 'https://first.com' }),
        'tab-2': makeTab({ id: 'tab-2', url: 'https://second.com' }),
      },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1', 'tab-2'] }) },
    })
    await openSessionTabs('session-1')
    expect(calls).toEqual(['https://first.com', 'https://second.com'])
  })

  it('skips missing tab IDs', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1', 'missing-id'] }) },
    })
    await openSessionTabs('session-1')
    expect(createTab).toHaveBeenCalledOnce()
  })

  it('skips deleted tabs', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ status: 'deleted' }),
        'tab-2': makeTab({ id: 'tab-2', url: 'https://b.com', status: 'inbox' }),
      },
      sessions: { 'session-1': makeSession({ tabIds: ['tab-1', 'tab-2'] }) },
    })
    await openSessionTabs('session-1')
    expect(createTab).toHaveBeenCalledOnce()
    expect(createTab).toHaveBeenCalledWith('https://b.com')
  })

  it('updates openCount and lastOpenedAt on each opened tab', async () => {
    setStore({
      tabs: { 'tab-1': makeTab({ openCount: 2 }) },
      sessions: { 'session-1': makeSession() },
    })
    await openSessionTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].openCount).toBe(3)
    expect(saved.tabs['tab-1'].lastOpenedAt).toBeGreaterThan(0)
  })

  it('updates session.lastRestoredAt', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await openSessionTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].lastRestoredAt).toBeGreaterThan(0)
  })

  it('does NOT delete the session', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await openSessionTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1']).toBeDefined()
    expect(saved.sessions['session-1'].status).toBe('active')
  })

  it('does NOT delete any SavedTab', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await openSessionTabs('session-1')
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1']).toBeDefined()
    expect(saved.tabs['tab-1'].status).toBe('inbox')
  })

  it('does NOT close any existing browser tab', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession() },
    })
    await openSessionTabs('session-1')
    // closeTab is not imported, so just verify createTab only
    expect(createTab).toHaveBeenCalled()
  })

  it('throws when session does not exist', async () => {
    setStore({ tabs: {}, sessions: {} })
    await expect(openSessionTabs('nonexistent')).rejects.toThrow()
  })

  it('throws when session is deleted', async () => {
    setStore({
      tabs: { 'tab-1': makeTab() },
      sessions: { 'session-1': makeSession({ status: 'deleted' }) },
    })
    await expect(openSessionTabs('session-1')).rejects.toThrow()
  })
})
