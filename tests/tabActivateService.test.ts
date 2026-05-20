import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserTab } from '../src/domain/browserTabTypes'

vi.mock('../src/chrome/chromeTabsClient', () => ({
  activateTab: vi.fn(),
  createTab: vi.fn(),
  closeTab: vi.fn(),
  getCurrentWindowTabs: vi.fn(),
}))

vi.mock('../src/repositories/storageRepository', () => ({
  getStore: vi.fn(),
  saveStore: vi.fn(),
}))

import { activateBrowserTab } from '../src/services/tabActivateService'
import { activateTab, createTab, closeTab } from '../src/chrome/chromeTabsClient'
import { getStore } from '../src/repositories/storageRepository'

const makeTab = (overrides: Partial<BrowserTab> = {}): BrowserTab => ({
  id: 5,
  windowId: 1,
  index: 0,
  url: 'https://example.com',
  title: 'Example',
  pinned: false,
  active: false,
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(activateTab).mockResolvedValue(undefined)
})

describe('activateBrowserTab', () => {
  it('calls activateTab with tab.id and tab.windowId', async () => {
    await activateBrowserTab(makeTab({ id: 7, windowId: 2 }))
    expect(activateTab).toHaveBeenCalledWith(7, 2)
    expect(activateTab).toHaveBeenCalledOnce()
  })

  it('throws a clear error when tab.id is falsy', async () => {
    const tab = makeTab({ id: 0 })
    await expect(activateBrowserTab(tab)).rejects.toThrow('切换标签页失败')
    expect(activateTab).not.toHaveBeenCalled()
  })

  it('wraps activateTab errors with a clear message', async () => {
    vi.mocked(activateTab).mockRejectedValue(new Error('Chrome API error'))
    await expect(activateBrowserTab(makeTab())).rejects.toThrow('切换标签页失败')
  })

  it('does not call chrome.tabs.create', async () => {
    await activateBrowserTab(makeTab())
    expect(createTab).not.toHaveBeenCalled()
  })

  it('does not call chrome.tabs.remove', async () => {
    await activateBrowserTab(makeTab())
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('does not read or write storage', async () => {
    await activateBrowserTab(makeTab())
    expect(getStore).not.toHaveBeenCalled()
  })
})
