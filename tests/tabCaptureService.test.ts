import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreState } from '../src/domain/storeTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'

// Repository is mocked so chrome.storage.local is never called in tests
vi.mock('../src/repositories/storageRepository', () => {
  const store: { state: StoreState } = { state: { version: 1, tabs: {} } }
  return {
    getStore: vi.fn(async () => store.state),
    saveStore: vi.fn(async (s: StoreState) => { store.state = s }),
  }
})

import { captureBrowserTab } from '../src/services/tabCaptureService'
import { getStore, saveStore } from '../src/repositories/storageRepository'
import type { BrowserTab } from '../src/domain/browserTabTypes'

const mockTab = (overrides: Partial<BrowserTab> = {}): BrowserTab => ({
  id: 1,
  windowId: 1,
  index: 0,
  url: 'https://example.com/page',
  title: 'Example Page',
  pinned: false,
  active: true,
  ...overrides,
})

beforeEach(() => {
  vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: {} })
  vi.mocked(saveStore).mockResolvedValue(undefined)
})

describe('captureBrowserTab', () => {
  it('throws for non-collectible URL', async () => {
    await expect(
      captureBrowserTab(mockTab({ url: 'chrome://extensions' }))
    ).rejects.toThrow()
  })

  it('creates a new SavedTab for a new URL', async () => {
    const saved = await captureBrowserTab(mockTab())
    expect(saved.status).toBe('inbox')
    expect(saved.url).toBe('https://example.com/page')
    expect(saved.title).toBe('Example Page')
    expect(saved.openCount).toBe(0)
    expect(saved.tags).toEqual([])
    expect(saved.id).toBeTruthy()
    expect(saveStore).toHaveBeenCalledOnce()
  })

  it('strips tracking params in normalizedUrl', async () => {
    const saved = await captureBrowserTab(
      mockTab({ url: 'https://example.com/page?utm_source=x' })
    )
    expect(saved.normalizedUrl).not.toContain('utm_source')
    expect(saved.url).toContain('utm_source')
  })

  it('updates updatedAt when same normalizedUrl exists and is not deleted', async () => {
    const existing: SavedTab = {
      id: 'existing-id',
      url: 'https://example.com/page',
      normalizedUrl: 'https://example.com/page',
      title: 'Old',
      domain: 'example.com',
      capturedAt: 1000,
      updatedAt: 1000,
      openCount: 0,
      status: 'inbox',
      tags: [],
    }
    vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: { 'existing-id': existing } })

    const result = await captureBrowserTab(mockTab())
    expect(result.id).toBe('existing-id')
    expect(result.status).toBe('inbox')
    expect(result.updatedAt).toBeGreaterThan(1000)
  })

  it('restores deleted tab with same normalizedUrl back to inbox', async () => {
    const deleted: SavedTab = {
      id: 'del-id',
      url: 'https://example.com/page',
      normalizedUrl: 'https://example.com/page',
      title: 'Deleted',
      domain: 'example.com',
      capturedAt: 1000,
      updatedAt: 2000,
      deletedAt: 2000,
      openCount: 0,
      status: 'deleted',
      tags: [],
    }
    vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: { 'del-id': deleted } })

    const result = await captureBrowserTab(mockTab())
    expect(result.id).toBe('del-id')
    expect(result.status).toBe('inbox')
    expect(result.deletedAt).toBeUndefined()
  })

  it('populates domain from URL', async () => {
    const saved = await captureBrowserTab(mockTab({ url: 'https://news.example.com/article' }))
    expect(saved.domain).toBe('news.example.com')
  })

  it('copies source tab metadata', async () => {
    const saved = await captureBrowserTab(
      mockTab({ id: 42, windowId: 7, index: 3, pinned: true })
    )
    expect(saved.sourceTabId).toBe(42)
    expect(saved.sourceWindowId).toBe(7)
    expect(saved.sourceTabIndex).toBe(3)
    expect(saved.sourcePinned).toBe(true)
  })
})
