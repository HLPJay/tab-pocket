import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreState } from '../src/domain/storeTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'

vi.mock('../src/repositories/storageRepository', () => ({
  getStore: vi.fn(),
  softDeleteSavedTab: vi.fn(),
}))

import { deleteSavedTab } from '../src/services/tabDeleteService'
import { getStore, softDeleteSavedTab } from '../src/repositories/storageRepository'

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

const storeWith = (tab: SavedTab): StoreState => ({
  version: 1,
  tabs: { [tab.id]: tab },
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(softDeleteSavedTab).mockResolvedValue(undefined)
})

describe('deleteSavedTab', () => {
  it('calls softDeleteSavedTab with the given id for an inbox tab', async () => {
    vi.mocked(getStore).mockResolvedValue(storeWith(makeTab()))
    await deleteSavedTab('tab-1')
    expect(softDeleteSavedTab).toHaveBeenCalledWith('tab-1')
    expect(softDeleteSavedTab).toHaveBeenCalledOnce()
  })

  it('throws a clear error when id does not exist', async () => {
    vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: {} })
    await expect(deleteSavedTab('nonexistent')).rejects.toThrow('未找到收纳记录')
    expect(softDeleteSavedTab).not.toHaveBeenCalled()
  })

  it('does not call chrome.tabs.remove or any browser tab close API', async () => {
    vi.mocked(getStore).mockResolvedValue(storeWith(makeTab()))
    // If chrome.tabs.remove were called it would throw (no chrome global).
    // Passing here confirms no real tab API is touched.
    await expect(deleteSavedTab('tab-1')).resolves.toBeUndefined()
  })

  it('does not call chrome.tabs.discard', async () => {
    vi.mocked(getStore).mockResolvedValue(storeWith(makeTab()))
    await deleteSavedTab('tab-1')
    // Same reasoning — chrome global is absent; any call would throw.
    expect(softDeleteSavedTab).toHaveBeenCalledOnce()
  })

  it('does not affect other tabs in the store', async () => {
    const otherTab = makeTab({ id: 'other-tab' })
    const targetTab = makeTab({ id: 'tab-1' })
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'tab-1': targetTab, 'other-tab': otherTab },
    })
    await deleteSavedTab('tab-1')
    // softDeleteSavedTab is called with only 'tab-1'
    expect(softDeleteSavedTab).toHaveBeenCalledWith('tab-1')
    expect(softDeleteSavedTab).not.toHaveBeenCalledWith('other-tab')
  })
})
