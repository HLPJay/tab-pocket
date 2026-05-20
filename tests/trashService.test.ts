import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/repositories/storageRepository', () => ({
  restoreSavedTab: vi.fn(),
  hardDeleteSavedTab: vi.fn(),
  clearTrash: vi.fn(),
}))

vi.mock('../src/chrome/chromeTabsClient', () => ({
  closeTab: vi.fn(),
  createTab: vi.fn(),
  getCurrentWindowTabs: vi.fn(),
}))

import { restoreTab, hardDeleteTab, clearTrash } from '../src/services/trashService'
import { restoreSavedTab, hardDeleteSavedTab, clearTrash as clearTrashRepo } from '../src/repositories/storageRepository'
import { closeTab } from '../src/chrome/chromeTabsClient'

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(restoreSavedTab).mockResolvedValue(undefined)
  vi.mocked(hardDeleteSavedTab).mockResolvedValue(undefined)
  vi.mocked(clearTrashRepo).mockResolvedValue(undefined)
})

describe('restoreTab', () => {
  it('delegates to restoreSavedTab with the given id', async () => {
    await restoreTab('tab-abc')
    expect(restoreSavedTab).toHaveBeenCalledWith('tab-abc')
    expect(restoreSavedTab).toHaveBeenCalledOnce()
  })

  it('does not call closeTab', async () => {
    await restoreTab('tab-abc')
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('propagates errors from the repository', async () => {
    vi.mocked(restoreSavedTab).mockRejectedValue(new Error('storage error'))
    await expect(restoreTab('tab-abc')).rejects.toThrow('storage error')
  })
})

describe('hardDeleteTab', () => {
  it('delegates to hardDeleteSavedTab with the given id', async () => {
    await hardDeleteTab('tab-xyz')
    expect(hardDeleteSavedTab).toHaveBeenCalledWith('tab-xyz')
    expect(hardDeleteSavedTab).toHaveBeenCalledOnce()
  })

  it('does not call closeTab', async () => {
    await hardDeleteTab('tab-xyz')
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('propagates errors from the repository', async () => {
    vi.mocked(hardDeleteSavedTab).mockRejectedValue(new Error('hard delete failed'))
    await expect(hardDeleteTab('tab-xyz')).rejects.toThrow('hard delete failed')
  })
})

describe('clearTrash', () => {
  it('delegates to the repository clearTrash', async () => {
    await clearTrash()
    expect(clearTrashRepo).toHaveBeenCalledOnce()
  })

  it('does not call closeTab', async () => {
    await clearTrash()
    expect(closeTab).not.toHaveBeenCalled()
  })

  it('propagates errors from the repository', async () => {
    vi.mocked(clearTrashRepo).mockRejectedValue(new Error('clear failed'))
    await expect(clearTrash()).rejects.toThrow('clear failed')
  })
})
