import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreState } from '../src/domain/storeTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'

vi.mock('../src/repositories/storageRepository', () => {
  const store: { state: StoreState } = { state: { version: 1, tabs: {}, sessions: {} } }
  return {
    getStore: vi.fn(async () => JSON.parse(JSON.stringify(store.state))),
    saveStore: vi.fn(async (s: StoreState) => { store.state = s }),
  }
})

import { updateSavedTabMeta } from '../src/services/savedTabMetaService'
import { getStore, saveStore } from '../src/repositories/storageRepository'

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
  sessionId: 'sess-1',
  ...overrides,
})

function setStore(tab: SavedTab) {
  vi.mocked(getStore).mockResolvedValue({
    version: 1,
    tabs: { [tab.id]: tab },
    sessions: {},
  })
  vi.mocked(saveStore).mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('updateSavedTabMeta', () => {
  it('updates note', async () => {
    setStore(makeTab())
    await updateSavedTabMeta('tab-1', { note: 'new note' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].note).toBe('new note')
  })

  it('trims note before saving', async () => {
    setStore(makeTab())
    await updateSavedTabMeta('tab-1', { note: '  spaces  ' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].note).toBe('spaces')
  })

  it('clears note when empty string is passed', async () => {
    setStore(makeTab({ note: 'existing note' }))
    await updateSavedTabMeta('tab-1', { note: '' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].note).toBeUndefined()
  })

  it('updates tag — sets tags = [tag]', async () => {
    setStore(makeTab())
    await updateSavedTabMeta('tab-1', { tag: 'AI工具' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].tags).toEqual(['AI工具'])
  })

  it('clears tags when empty tag is passed', async () => {
    setStore(makeTab({ tags: ['AI工具'] }))
    await updateSavedTabMeta('tab-1', { tag: '' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].tags).toEqual([])
  })

  it('updates reviewStatus', async () => {
    setStore(makeTab())
    await updateSavedTabMeta('tab-1', { reviewStatus: 'reviewed' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].reviewStatus).toBe('reviewed')
  })

  it('throws when id is not found', async () => {
    vi.mocked(getStore).mockResolvedValue({ version: 1, tabs: {}, sessions: {} })
    vi.mocked(saveStore).mockResolvedValue(undefined)
    await expect(updateSavedTabMeta('nonexistent', { note: 'x' })).rejects.toThrow()
  })

  it('does not change url, status, or sessionId', async () => {
    const original = makeTab({ url: 'https://example.com', status: 'inbox', sessionId: 'sess-1' })
    setStore(original)
    await updateSavedTabMeta('tab-1', { note: 'changed', tag: 'AI工具', reviewStatus: 'processing' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].url).toBe('https://example.com')
    expect(saved.tabs['tab-1'].status).toBe('inbox')
    expect(saved.tabs['tab-1'].sessionId).toBe('sess-1')
  })

  it('updates updatedAt', async () => {
    setStore(makeTab({ updatedAt: 1 }))
    await updateSavedTabMeta('tab-1', { note: 'x' })
    const saved = vi.mocked(saveStore).mock.calls[0][0]
    expect(saved.tabs['tab-1'].updatedAt).toBeGreaterThan(1)
  })
})
