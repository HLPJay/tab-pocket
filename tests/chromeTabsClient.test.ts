import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
})

import { createTab, closeTab } from '../src/chrome/chromeTabsClient'

// Verify no batch-close export exists
import * as chromeTabsClientModule from '../src/chrome/chromeTabsClient'

beforeEach(() => {
  vi.mocked(chrome.tabs.create).mockReset()
  vi.mocked(chrome.tabs.remove).mockReset()
})

describe('createTab', () => {
  it('calls chrome.tabs.create with the given url', async () => {
    const mockTab = { id: 1, url: 'https://example.com' } as chrome.tabs.Tab
    vi.mocked(chrome.tabs.create).mockResolvedValue(mockTab)

    const result = await createTab('https://example.com')
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' })
    expect(result).toBe(mockTab)
  })
})

describe('closeTab', () => {
  it('calls chrome.tabs.remove with the given tabId', async () => {
    vi.mocked(chrome.tabs.remove).mockResolvedValue(undefined)

    await closeTab(42)
    expect(chrome.tabs.remove).toHaveBeenCalledWith(42)
    expect(chrome.tabs.remove).toHaveBeenCalledOnce()
  })

  it('propagates errors from chrome.tabs.remove', async () => {
    vi.mocked(chrome.tabs.remove).mockRejectedValue(new Error('Tab not found'))

    await expect(closeTab(99)).rejects.toThrow('Tab not found')
  })

  it('does not export a batch closeTabs function', () => {
    expect((chromeTabsClientModule as Record<string, unknown>)['closeTabs']).toBeUndefined()
  })
})
