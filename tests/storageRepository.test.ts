import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'

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

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
  vi.mocked(chrome.storage.local.get).mockClear()
  vi.mocked(chrome.storage.local.set).mockClear()
})

describe('getStore', () => {
  it('returns default store when storage is empty', async () => {
    const store = await getStore()
    expect(store).toEqual({ version: 1, tabs: {} })
  })

  it('returns default store when stored value is not an object', async () => {
    mockStore['tabPocketStore'] = null
    const store = await getStore()
    expect(store).toEqual({ version: 1, tabs: {} })
  })
})

describe('saveStore', () => {
  it('writes the store to chrome.storage.local', async () => {
    const state = { version: 1 as const, tabs: { 'tab-1': makeTab() } }
    await saveStore(state)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ tabPocketStore: state })
  })
})

describe('upsertSavedTab', () => {
  it('inserts a new tab into an empty store', async () => {
    const tab = makeTab()
    await upsertSavedTab(tab)
    const store = await getStore()
    expect(store.tabs['tab-1']).toMatchObject({ id: 'tab-1', url: 'https://example.com' })
  })

  it('overwrites an existing tab with the same id', async () => {
    await upsertSavedTab(makeTab({ openCount: 0 }))
    await upsertSavedTab(makeTab({ openCount: 5 }))
    const store = await getStore()
    expect(store.tabs['tab-1'].openCount).toBe(5)
  })

  it('does not store body content, screenshots, or base64 favicon', async () => {
    const tab = makeTab()
    await upsertSavedTab(tab)
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
    expect(tab.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('does nothing when id does not exist', async () => {
    await expect(softDeleteSavedTab('nonexistent')).resolves.toBeUndefined()
  })
})

describe('markSavedTabOpened', () => {
  it('increments openCount and sets lastOpenedAt and updatedAt', async () => {
    await upsertSavedTab(makeTab({ openCount: 2 }))
    const before = Date.now()
    await markSavedTabOpened('tab-1')
    const after = Date.now()
    const store = await getStore()
    const tab = store.tabs['tab-1']
    expect(tab.openCount).toBe(3)
    expect(tab.lastOpenedAt).toBeGreaterThanOrEqual(before)
    expect(tab.lastOpenedAt).toBeLessThanOrEqual(after)
    expect(tab.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('does nothing when id does not exist', async () => {
    await expect(markSavedTabOpened('nonexistent')).resolves.toBeUndefined()
  })
})
