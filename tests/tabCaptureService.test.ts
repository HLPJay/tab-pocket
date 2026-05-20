import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreState } from '../src/domain/storeTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'

vi.mock('../src/repositories/storageRepository', () => {
  const store: { state: StoreState } = { state: { version: 1, tabs: {}, sessions: {} } }
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

const existingTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
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
  ...overrides,
})

beforeEach(() => {
  vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: {}, sessions: {} })
  vi.mocked(saveStore).mockResolvedValue(undefined)
})

describe('captureBrowserTab — basic', () => {
  it('throws for non-collectible URL', async () => {
    await expect(captureBrowserTab(mockTab({ url: 'chrome://extensions' }))).rejects.toThrow()
  })

  it('creates a new SavedTab for a new URL', async () => {
    const saved = await captureBrowserTab(mockTab())
    expect(saved.status).toBe('inbox')
    expect(saved.url).toBe('https://example.com/page')
    expect(saved.openCount).toBe(0)
    expect(saved.tags).toEqual([])
    expect(saveStore).toHaveBeenCalledOnce()
  })

  it('strips tracking params in normalizedUrl', async () => {
    const saved = await captureBrowserTab(mockTab({ url: 'https://example.com/page?utm_source=x' }))
    expect(saved.normalizedUrl).not.toContain('utm_source')
    expect(saved.url).toContain('utm_source')
  })

  it('updates updatedAt when same normalizedUrl exists and is not deleted', async () => {
    vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: { 'existing-id': existingTab() }, sessions: {} })
    const result = await captureBrowserTab(mockTab())
    expect(result.id).toBe('existing-id')
    expect(result.status).toBe('inbox')
    expect(result.updatedAt).toBeGreaterThan(1000)
  })

  it('restores deleted tab back to inbox', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ status: 'deleted', deletedAt: 2000 }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab())
    expect(result.id).toBe('existing-id')
    expect(result.status).toBe('inbox')
    expect(result.deletedAt).toBeUndefined()
  })

  it('populates domain from URL', async () => {
    const saved = await captureBrowserTab(mockTab({ url: 'https://news.example.com/article' }))
    expect(saved.domain).toBe('news.example.com')
  })
})

describe('captureBrowserTab — note handling', () => {
  it('saves trimmed note on new tab', async () => {
    const saved = await captureBrowserTab(mockTab(), { note: '  参考资料  ' })
    expect(saved.note).toBe('参考资料')
  })

  it('trims whitespace from note', async () => {
    const saved = await captureBrowserTab(mockTab(), { note: '  \n  hello \n  ' })
    expect(saved.note).toBe('hello')
  })

  it('empty note does not affect capture (note is undefined)', async () => {
    const saved = await captureBrowserTab(mockTab(), { note: '' })
    expect(saved.note).toBeUndefined()
    expect(saved.status).toBe('inbox')
  })

  it('no options provided — note is undefined', async () => {
    const saved = await captureBrowserTab(mockTab())
    expect(saved.note).toBeUndefined()
  })

  it('dedup hit (non-deleted) + non-empty note — updates note', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ note: '旧备注' }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab(), { note: '新备注' })
    expect(result.note).toBe('新备注')
  })

  it('dedup hit (non-deleted) + empty note — preserves existing note', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ note: '保留这条备注' }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab(), { note: '' })
    expect(result.note).toBe('保留这条备注')
  })

  it('dedup hit (non-deleted) + no options — preserves existing note', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ note: '保留这条备注' }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab())
    expect(result.note).toBe('保留这条备注')
  })

  it('deleted restore + non-empty note — updates note', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ status: 'deleted', deletedAt: 2000, note: '旧备注' }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab(), { note: '恢复时新备注' })
    expect(result.status).toBe('inbox')
    expect(result.note).toBe('恢复时新备注')
  })

  it('deleted restore + empty note — preserves original note', async () => {
    vi.mocked(getStore).mockResolvedValue({
      version: 1,
      tabs: { 'existing-id': existingTab({ status: 'deleted', deletedAt: 2000, note: '原始备注' }) },
      sessions: {},
    })
    const result = await captureBrowserTab(mockTab(), { note: '' })
    expect(result.status).toBe('inbox')
    expect(result.note).toBe('原始备注')
  })
})
