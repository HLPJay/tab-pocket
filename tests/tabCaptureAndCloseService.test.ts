import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { BrowserTab } from '../src/domain/browserTabTypes'

vi.mock('../src/services/tabCaptureService', () => ({
  captureBrowserTab: vi.fn(),
}))

vi.mock('../src/chrome/chromeTabsClient', () => ({
  closeTab: vi.fn(),
  createTab: vi.fn(),
  getCurrentWindowTabs: vi.fn(),
}))

import { captureBrowserTabAndClose } from '../src/services/tabCaptureAndCloseService'
import { captureBrowserTab } from '../src/services/tabCaptureService'
import { closeTab } from '../src/chrome/chromeTabsClient'

const makeBrowserTab = (overrides: Partial<BrowserTab> = {}): BrowserTab => ({
  id: 7,
  windowId: 1,
  index: 0,
  url: 'https://example.com',
  title: 'Example',
  pinned: false,
  active: true,
  ...overrides,
})

const makeSavedTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
  id: 'saved-1',
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
  vi.resetAllMocks()
  vi.mocked(captureBrowserTab).mockResolvedValue(makeSavedTab())
  vi.mocked(closeTab).mockResolvedValue(undefined)
})

describe('captureBrowserTabAndClose — ordering', () => {
  it('calls captureBrowserTab before closeTab', async () => {
    const order: string[] = []
    vi.mocked(captureBrowserTab).mockImplementation(async () => { order.push('capture'); return makeSavedTab() })
    vi.mocked(closeTab).mockImplementation(async () => { order.push('close') })
    await captureBrowserTabAndClose(makeBrowserTab())
    expect(order).toEqual(['capture', 'close'])
  })

  it('does NOT call closeTab when captureBrowserTab fails', async () => {
    vi.mocked(captureBrowserTab).mockRejectedValue(new Error('storage full'))
    await expect(captureBrowserTabAndClose(makeBrowserTab())).rejects.toThrow('storage full')
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('when closeTab fails, captureBrowserTab was already called (data preserved)', async () => {
    vi.mocked(closeTab).mockRejectedValue(new Error('Cannot close tab'))
    await expect(captureBrowserTabAndClose(makeBrowserTab())).rejects.toThrow('Cannot close tab')
    expect(captureBrowserTab).toHaveBeenCalledOnce()
  })

  it('returns the SavedTab on success', async () => {
    const saved = makeSavedTab()
    vi.mocked(captureBrowserTab).mockResolvedValue(saved)
    const result = await captureBrowserTabAndClose(makeBrowserTab())
    expect(result).toBe(saved)
  })
})

describe('captureBrowserTabAndClose — guards', () => {
  it('throws for pinned tabs without calling captureBrowserTab', async () => {
    await expect(captureBrowserTabAndClose(makeBrowserTab({ pinned: true }))).rejects.toThrow('固定标签不可关闭')
    expect(captureBrowserTab).not.toHaveBeenCalled()
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('throws for non-collectible URLs', async () => {
    await expect(captureBrowserTabAndClose(makeBrowserTab({ url: 'chrome://extensions' }))).rejects.toThrow()
    expect(captureBrowserTab).not.toHaveBeenCalled()
  })

  it('calls closeTab with tab.id', async () => {
    await captureBrowserTabAndClose(makeBrowserTab({ id: 42 }))
    expect(closeTab).toHaveBeenCalledWith(42)
  })
})

describe('captureBrowserTabAndClose — note passing', () => {
  it('passes note to captureBrowserTab', async () => {
    await captureBrowserTabAndClose(makeBrowserTab(), { note: '这个页面后面参考' })
    expect(captureBrowserTab).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com' }),
      { note: '这个页面后面参考' }
    )
  })

  it('passes undefined note when options is omitted', async () => {
    await captureBrowserTabAndClose(makeBrowserTab())
    expect(captureBrowserTab).toHaveBeenCalledWith(
      expect.anything(),
      { note: undefined }
    )
  })

  it('when closeTab fails, captureBrowserTab was called with the correct note', async () => {
    vi.mocked(closeTab).mockRejectedValue(new Error('close failed'))
    await expect(
      captureBrowserTabAndClose(makeBrowserTab(), { note: '关闭失败时备注仍已保存' })
    ).rejects.toThrow('close failed')
    expect(captureBrowserTab).toHaveBeenCalledWith(
      expect.anything(),
      { note: '关闭失败时备注仍已保存' }
    )
  })

  it('save failure propagates error without calling closeTab', async () => {
    vi.mocked(captureBrowserTab).mockRejectedValue(new Error('save error'))
    await expect(
      captureBrowserTabAndClose(makeBrowserTab(), { note: '备注' })
    ).rejects.toThrow('save error')
    expect(closeTab).not.toHaveBeenCalled()
  })
})
