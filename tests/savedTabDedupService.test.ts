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

import { normalizeDuplicateSavedTabs } from '../src/services/savedTabDedupService'
import { getStore, saveStore } from '../src/repositories/storageRepository'

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

describe('normalizeDuplicateSavedTabs', () => {
  it('does not call saveStore when there are no duplicates', async () => {
    setStore({
      tabs: { 'tab-1': makeTab({ id: 'tab-1', normalizedUrl: 'https://a.com/' }) },
    })
    await normalizeDuplicateSavedTabs()
    expect(saveStore).not.toHaveBeenCalled()
  })

  it('does not call saveStore when all tabs are deleted', async () => {
    setStore({
      tabs: {
        'tab-1': makeTab({ id: 'tab-1', status: 'deleted' }),
        'tab-2': makeTab({ id: 'tab-2', status: 'deleted' }),
      },
    })
    await normalizeDuplicateSavedTabs()
    expect(saveStore).not.toHaveBeenCalled()
  })

  it('soft-deletes the duplicate and keeps the canonical', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, capturedAt: 2000 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, capturedAt: 1000 }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].status).toBe('inbox')
    expect(saved.tabs['tab-older'].status).toBe('deleted')
  })

  it('merges note from duplicate into canonical when canonical has no note', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, note: undefined }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, note: 'from duplicate' }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].note).toBe('from duplicate')
  })

  it('keeps canonical note when both have notes', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, note: 'canonical note' }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, note: 'duplicate note' }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].note).toBe('canonical note')
  })

  it('merges tags as union from all duplicates', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, tags: ['AI工具'] }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, tags: ['开发文档'] }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].tags).toContain('AI工具')
    expect(saved.tabs['tab-newer'].tags).toContain('开发文档')
  })

  it('keeps highest reviewStatus: processing beats unprocessed', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, reviewStatus: 'unprocessed' }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, reviewStatus: 'processing' }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].reviewStatus).toBe('processing')
  })

  it('keeps highest reviewStatus: reviewed beats processing', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, reviewStatus: 'processing' }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, reviewStatus: 'reviewed' }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].reviewStatus).toBe('reviewed')
  })

  it('sums openCount from all duplicates', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, openCount: 3 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, openCount: 5 }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].openCount).toBe(8)
  })

  it('keeps max lastOpenedAt from all duplicates', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000, lastOpenedAt: 500 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000, lastOpenedAt: 9000 }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-newer'].lastOpenedAt).toBe(9000)
  })

  it('calls getStore once and saveStore once when there are duplicates', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000 }),
      },
    })
    await normalizeDuplicateSavedTabs()
    expect(getStore).toHaveBeenCalledOnce()
    expect(saveStore).toHaveBeenCalledOnce()
  })

  it('replaces duplicate tabId with canonical id in active session', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000 }),
      },
      sessions: {
        'session-1': makeSession({ id: 'session-1', tabIds: ['tab-older'] }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].tabIds).toContain('tab-newer')
    expect(saved.sessions['session-1'].tabIds).not.toContain('tab-older')
  })

  it('deduplicates session tabIds when both canonical and duplicate are present', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000 }),
      },
      sessions: {
        'session-1': makeSession({ id: 'session-1', tabIds: ['tab-newer', 'tab-older'] }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].tabIds).toEqual(['tab-newer'])
  })

  it('does not modify deleted sessions when fixing tabIds', async () => {
    setStore({
      tabs: {
        'tab-newer': makeTab({ id: 'tab-newer', updatedAt: 2000 }),
        'tab-older': makeTab({ id: 'tab-older', updatedAt: 1000 }),
      },
      sessions: {
        'session-1': makeSession({ id: 'session-1', status: 'deleted', tabIds: ['tab-older'] }),
      },
    })
    await normalizeDuplicateSavedTabs()
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.sessions['session-1'].tabIds).toEqual(['tab-older'])
  })
})
