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

describe('captureBrowserTabsAsSession', () => {
  it('calls captureBrowserTab for each http/https tab', async () => {
    const saved1 = makeSavedTab({ id: 'a' })
    const saved2 = makeSavedTab({ id: 'b' })
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(saved1)
      .mockResolvedValueOnce(saved2)

    await captureBrowserTabsAsSession([
      makeTab({ id: 1, url: 'https://example.com' }),
      makeTab({ id: 2, url: 'http://other.com' }),
    ])

    expect(captureBrowserTab).toHaveBeenCalledTimes(2)
  })

  it('skips chrome://, edge://, about: and other non-collectible tabs', async () => {
    const saved = makeSavedTab({ id: 'a' })
    vi.mocked(captureBrowserTab).mockResolvedValue(saved)

    await captureBrowserTabsAsSession([
      makeTab({ url: 'chrome://extensions' }),
      makeTab({ url: 'edge://settings' }),
      makeTab({ url: 'about:blank' }),
      makeTab({ url: 'https://example.com' }),
    ])

    expect(captureBrowserTab).toHaveBeenCalledTimes(1)
  })

  it('throws a clear error when no collectible tabs exist', async () => {
    await expect(
      captureBrowserTabsAsSession([
        makeTab({ url: 'chrome://newtab' }),
        makeTab({ url: 'about:blank' }),
      ])
    ).rejects.toThrow('没有可收纳')
  })

  it('Session.tabIds uses SavedTab.id returned by captureBrowserTab', async () => {
    const saved = makeSavedTab({ id: 'my-saved-id' })
    vi.mocked(captureBrowserTab).mockResolvedValue(saved)

    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.tabIds).toContain('my-saved-id')
  })

  it('tabIds within a single session are unique (no duplicates)', async () => {
    const sharedSavedTab = makeSavedTab({ id: 'deduped-id' })
    vi.mocked(captureBrowserTab).mockResolvedValue(sharedSavedTab)

    const session = await captureBrowserTabsAsSession([
      makeTab({ id: 1, url: 'https://example.com' }),
      makeTab({ id: 2, url: 'https://example.com/page' }),
    ])

    const unique = new Set(session.tabIds)
    expect(unique.size).toBe(session.tabIds.length)
  })

  it('duplicate URLs (same SavedTab.id via dedup) appear only once in tabIds', async () => {
    const shared = makeSavedTab({ id: 'same-id' })
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(shared)
      .mockResolvedValueOnce(shared)

    const session = await captureBrowserTabsAsSession([
      makeTab({ id: 1, url: 'https://example.com' }),
      makeTab({ id: 2, url: 'https://example.com?utm_source=x' }),
    ])

    expect(session.tabIds.filter((id) => id === 'same-id')).toHaveLength(1)
  })

  it('uses options.name as session name when provided', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())

    const session = await captureBrowserTabsAsSession([makeTab()], { name: 'My Custom Session' })
    expect(session.name).toBe('My Custom Session')
  })

  it('default name contains "当前窗口"', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())

    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.name).toContain('当前窗口')
  })

  it('calls upsertSavedSession with the constructed session', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab({ id: 'x' }))

    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(upsertSavedSession).toHaveBeenCalledWith(session)
  })

  it('does NOT call closeTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())

    await captureBrowserTabsAsSession([makeTab()])
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('returned session has status active', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())

    const session = await captureBrowserTabsAsSession([makeTab()])
    expect(session.status).toBe('active')
  })
})
