import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserTab } from '../src/domain/browserTabTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'

vi.mock('../src/services/tabCaptureService', () => ({
  captureBrowserTab: vi.fn(),
}))

vi.mock('../src/repositories/storageRepository', () => ({
  upsertSavedSession: vi.fn(),
  getStore: vi.fn(),
  saveStore: vi.fn(),
}))

vi.mock('../src/chrome/chromeTabsClient', () => ({
  closeTab: vi.fn(),
  createTab: vi.fn(),
  getCurrentWindowTabs: vi.fn(),
}))

import { captureBrowserTabsAsSession } from '../src/services/sessionCaptureService'
import { captureBrowserTab } from '../src/services/tabCaptureService'
import { upsertSavedSession } from '../src/repositories/storageRepository'
import { closeTab } from '../src/chrome/chromeTabsClient'

const makeTab = (overrides: Partial<BrowserTab> = {}): BrowserTab => ({
  id: 1,
  windowId: 1,
  index: 0,
  url: 'https://example.com',
  title: 'Example',
  pinned: false,
  active: false,
  ...overrides,
})

let savedIdCounter = 0
const makeSavedTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
  id: `saved-${++savedIdCounter}`,
  url: 'https://example.com',
  normalizedUrl: 'https://example.com/',
  title: 'Example',
  domain: 'example.com',
  capturedAt: Date.now(),
  updatedAt: Date.now(),
  openCount: 0,
  status: 'inbox',
  tags: [],
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()
  savedIdCounter = 0
  vi.mocked(upsertSavedSession).mockResolvedValue(undefined as never)
})

describe('captureBrowserTabsAsSession — filtering', () => {
  it('calls captureBrowserTab for each http/https tab', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeTab({ id: 1, url: 'https://example.com' }),
      makeTab({ id: 2, url: 'http://other.com' }),
    ])
    expect(captureBrowserTab).toHaveBeenCalledTimes(2)
  })

  it('skips chrome://, edge://, about: and other non-collectible tabs', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab({ id: 'a' }))
    await captureBrowserTabsAsSession([
      makeTab({ url: 'chrome://extensions' }),
      makeTab({ url: 'edge://settings' }),
      makeTab({ url: 'about:blank' }),
      makeTab({ url: 'https://example.com' }),
    ])
    expect(captureBrowserTab).toHaveBeenCalledTimes(1)
  })

  it('throws when no collectible tabs exist', async () => {
    await expect(
      captureBrowserTabsAsSession([makeTab({ url: 'chrome://newtab' })])
    ).rejects.toThrow('没有可收纳')
  })
})

describe('captureBrowserTabsAsSession — session structure', () => {
  it('Session.tabIds uses SavedTab.id returned by captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab({ id: 'my-saved-id' }))
    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.tabIds).toContain('my-saved-id')
  })

  it('tabIds within a session are unique', async () => {
    const shared = makeSavedTab({ id: 'deduped-id' })
    vi.mocked(captureBrowserTab).mockResolvedValue(shared)
    const session = await captureBrowserTabsAsSession([
      makeTab({ id: 1 }), makeTab({ id: 2 }),
    ])
    expect(new Set(session.tabIds).size).toBe(session.tabIds.length)
    expect(session.tabIds.filter((id) => id === 'deduped-id')).toHaveLength(1)
  })

  it('uses options.name as session name', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()], { name: 'My Session' })
    expect(session.name).toBe('My Session')
  })

  it('default name contains "当前窗口"', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.name).toContain('当前窗口')
  })

  it('returned session has status active', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.status).toBe('active')
  })

  it('does NOT call closeTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    await captureBrowserTabsAsSession([makeTab()])
    expect(closeTab).not.toHaveBeenCalled()
  })
})

describe('captureBrowserTabsAsSession — note handling', () => {
  it('saves trimmed note on the session', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()], { note: '  参考资料  ' })
    expect(session.note).toBe('参考资料')
  })

  it('empty note results in no note field on session', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()], { note: '' })
    expect(session.note).toBeUndefined()
  })

  it('session note is NOT written to individual SavedTabs', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    await captureBrowserTabsAsSession([makeTab()], { note: '仅 session 级别备注' })
    // captureBrowserTab is called without a note option
    expect(captureBrowserTab).toHaveBeenCalledWith(expect.anything())
    // Specifically: second argument should be undefined (not passed)
    const call = vi.mocked(captureBrowserTab).mock.calls[0]
    expect(call[1]).toBeUndefined()
  })

  it('options.name and options.note can both be set simultaneously', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeTab()], {
      name: 'P3 参考',
      note: '这批页面是 P3 Session 实现参考资料',
    })
    expect(session.name).toBe('P3 参考')
    expect(session.note).toBe('这批页面是 P3 Session 实现参考资料')
  })
})
