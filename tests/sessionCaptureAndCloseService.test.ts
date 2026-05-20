import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserTab } from '../src/domain/browserTabTypes'
import type { SavedTab } from '../src/domain/savedTabTypes'
import type { SavedSession } from '../src/domain/sessionTypes'
import type { SessionTabInput } from '../src/services/sessionCaptureService'

vi.mock('../src/services/sessionCaptureService', () => ({
  captureBrowserTabsAsSession: vi.fn(),
}))

vi.mock('../src/chrome/chromeTabsClient', () => ({
  closeTab: vi.fn(),
  createTab: vi.fn(),
}))

import { captureBrowserTabsAsSessionAndClose } from '../src/services/sessionCaptureAndCloseService'
import { captureBrowserTabsAsSession } from '../src/services/sessionCaptureService'
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

const makeInput = (tabOverrides: Partial<BrowserTab> = {}): SessionTabInput => ({
  tab: makeTab(tabOverrides),
  note: undefined,
})

const mockSession: SavedSession = {
  id: 'session-1',
  name: 'Test',
  tabIds: ['t1'],
  capturedAt: 1000,
  updatedAt: 1000,
  status: 'active',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(captureBrowserTabsAsSession).mockResolvedValue(mockSession)
  vi.mocked(closeTab).mockResolvedValue(undefined)
})

describe('captureBrowserTabsAsSessionAndClose', () => {
  it('calls captureBrowserTabsAsSession first', async () => {
    const inputs = [makeInput()]
    await captureBrowserTabsAsSessionAndClose(inputs)
    expect(captureBrowserTabsAsSession).toHaveBeenCalledWith(inputs, undefined)
  })

  it('closes selected non-pinned tabs after save', async () => {
    const inputs = [makeInput({ id: 5 })]
    await captureBrowserTabsAsSessionAndClose(inputs)
    expect(closeTab).toHaveBeenCalledWith(5)
    expect(closeTab).toHaveBeenCalledOnce()
  })

  it('does NOT close pinned tabs', async () => {
    const inputs = [makeInput({ id: 5, pinned: true })]
    await captureBrowserTabsAsSessionAndClose(inputs)
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('does NOT close any tab if save fails', async () => {
    vi.mocked(captureBrowserTabsAsSession).mockRejectedValue(new Error('save failed'))
    await expect(captureBrowserTabsAsSessionAndClose([makeInput()])).rejects.toThrow('save failed')
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('returns session in result', async () => {
    const result = await captureBrowserTabsAsSessionAndClose([makeInput()])
    expect(result.session).toBe(mockSession)
  })

  it('returns closeWarning when some tabs fail to close', async () => {
    vi.mocked(closeTab).mockRejectedValue(new Error('chrome error'))
    const result = await captureBrowserTabsAsSessionAndClose([makeInput({ id: 5 })])
    expect(result.closeWarning).toContain('1')
    expect(result.closeWarning).toContain('关闭失败')
  })

  it('does not use batch remove — closes tabs one by one', async () => {
    const inputs = [makeInput({ id: 1 }), makeInput({ id: 2, url: 'https://other.com' })]
    await captureBrowserTabsAsSessionAndClose(inputs)
    expect(closeTab).toHaveBeenCalledTimes(2)
    expect(closeTab).toHaveBeenCalledWith(1)
    expect(closeTab).toHaveBeenCalledWith(2)
  })

  it('does not roll back session data when close fails', async () => {
    vi.mocked(closeTab).mockRejectedValue(new Error('close error'))
    const result = await captureBrowserTabsAsSessionAndClose([makeInput({ id: 5 })])
    expect(result.session).toBe(mockSession)
    expect(captureBrowserTabsAsSession).toHaveBeenCalledOnce()
  })
})
