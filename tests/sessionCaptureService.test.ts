import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserTab } from '../src/domain/browserTabTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SessionTabInput } from '../src/services/sessionCaptureService'

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

const makeInput = (
  overrides: Partial<BrowserTab> = {},
  note?: string,
  tag?: string,
  reviewStatus?: SessionTabInput['reviewStatus']
): SessionTabInput => ({
  tab: makeTab(overrides),
  note,
  tag,
  reviewStatus,
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
  it('calls captureBrowserTab for each http/https input', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeInput({ url: 'https://example.com' }),
      makeInput({ url: 'http://other.com' }),
    ])
    expect(captureBrowserTab).toHaveBeenCalledTimes(2)
  })

  it('skips chrome://, edge://, about: and other non-collectible inputs', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab({ id: 'a' }))
    await captureBrowserTabsAsSession([
      makeInput({ url: 'chrome://extensions' }),
      makeInput({ url: 'edge://settings' }),
      makeInput({ url: 'about:blank' }),
      makeInput({ url: 'https://example.com' }),
    ])
    expect(captureBrowserTab).toHaveBeenCalledTimes(1)
  })

  it('throws when no collectible inputs exist', async () => {
    await expect(
      captureBrowserTabsAsSession([makeInput({ url: 'chrome://newtab' })])
    ).rejects.toThrow('没有可收纳')
  })
})

describe('captureBrowserTabsAsSession — session structure', () => {
  it('Session.tabIds uses SavedTab.id returned by captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab({ id: 'my-saved-id' }))
    const session = await captureBrowserTabsAsSession([makeInput()])
    expect(session.tabIds).toContain('my-saved-id')
  })

  it('tabIds within a session are unique', async () => {
    const shared = makeSavedTab({ id: 'deduped-id' })
    vi.mocked(captureBrowserTab).mockResolvedValue(shared)
    const session = await captureBrowserTabsAsSession([
      makeInput({ id: 1 }),
      makeInput({ id: 2 }),
    ])
    expect(new Set(session.tabIds).size).toBe(session.tabIds.length)
    expect(session.tabIds.filter((id) => id === 'deduped-id')).toHaveLength(1)
  })

  it('uses options.name as session name', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeInput()], { name: 'My Session' })
    expect(session.name).toBe('My Session')
  })

  it('default name contains "当前窗口"', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeInput()])
    expect(session.name).toContain('当前窗口')
  })

  it('returned session has status active', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeInput()])
    expect(session.status).toBe('active')
  })

  it('session does not require a global note field', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeInput()])
    expect(session.note).toBeUndefined()
  })

  it('does NOT call closeTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    await captureBrowserTabsAsSession([makeInput()])
    expect(closeTab).not.toHaveBeenCalled()
  })
})

describe('captureBrowserTabsAsSession — per-tab note', () => {
  it('passes each input note to captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeInput({ id: 1, url: 'https://a.com' }, '这是 A 的备注'),
      makeInput({ id: 2, url: 'https://b.com' }, '这是 B 的备注'),
    ])
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ url: 'https://a.com' }),
      expect.objectContaining({ note: '这是 A 的备注' })
    )
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ url: 'https://b.com' }),
      expect.objectContaining({ note: '这是 B 的备注' })
    )
  })

  it('passes undefined note when input has no note', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    await captureBrowserTabsAsSession([makeInput()])
    expect(captureBrowserTab).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ note: undefined })
    )
  })

  it('passes sessionId to captureBrowserTab so SavedTab gets sessionId written', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    await captureBrowserTabsAsSession([makeInput()])
    expect(captureBrowserTab).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sessionId: expect.any(String) })
    )
  })

  it('all inputs in a single session receive the same sessionId', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeInput({ id: 1, url: 'https://a.com' }),
      makeInput({ id: 2, url: 'https://b.com' }),
    ])
    const calls = vi.mocked(captureBrowserTab).mock.calls
    const sessionIdA = (calls[0][1] as { sessionId: string }).sessionId
    const sessionIdB = (calls[1][1] as { sessionId: string }).sessionId
    expect(sessionIdA).toBe(sessionIdB)
    expect(typeof sessionIdA).toBe('string')
  })

  it('session.id matches the sessionId passed to captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
    const session = await captureBrowserTabsAsSession([makeInput()])
    const calls = vi.mocked(captureBrowserTab).mock.calls
    const sessionId = (calls[0][1] as { sessionId: string }).sessionId
    expect(session.id).toBe(sessionId)
  })
})

describe('captureBrowserTabsAsSession — per-tab tag and reviewStatus', () => {
  it('passes each input tag to captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeInput({ id: 1, url: 'https://a.com' }, undefined, 'AI工具'),
      makeInput({ id: 2, url: 'https://b.com' }, undefined, '开发文档'),
    ])
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ tag: 'AI工具' })
    )
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ tag: '开发文档' })
    )
  })

  it('passes each input reviewStatus to captureBrowserTab', async () => {
    vi.mocked(captureBrowserTab)
      .mockResolvedValueOnce(makeSavedTab({ id: 'a' }))
      .mockResolvedValueOnce(makeSavedTab({ id: 'b' }))
    await captureBrowserTabsAsSession([
      makeInput({ id: 1, url: 'https://a.com' }, undefined, undefined, 'reviewed'),
      makeInput({ id: 2, url: 'https://b.com' }, undefined, undefined, 'processing'),
    ])
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ reviewStatus: 'reviewed' })
    )
    expect(captureBrowserTab).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ reviewStatus: 'processing' })
    )
  })
})
