import { useState, useCallback } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SavedTab, SavedTabReviewStatus } from '../../domain/savedTabTypes'
import { listSavedTabs } from '../../repositories/storageRepository'
import { captureBrowserTab } from '../../services/tabCaptureService'
import { captureBrowserTabAndClose } from '../../services/tabCaptureAndCloseService'
import { openSavedTab } from '../../services/tabOpenService'
import { deleteSavedTab } from '../../services/tabDeleteService'
import { restoreTab as restoreTabSvc, hardDeleteTab as hardDeleteTabSvc, clearTrash as clearTrashSvc } from '../../services/trashService'
import { updateSavedTabMeta } from '../../services/savedTabMetaService'

export type UseSavedTabsResult = {
  savedTabs: SavedTab[]
  loadingSaved: boolean
  savedError: string | null
  loadSavedTabs: () => Promise<void>
  captureTab: (tab: BrowserTab, note?: string, tag?: string, reviewStatus?: SavedTabReviewStatus) => Promise<void>
  captureAndCloseTab: (tab: BrowserTab, note?: string, tag?: string, reviewStatus?: SavedTabReviewStatus) => Promise<void>
  openTab: (id: string) => Promise<void>
  deleteTab: (id: string) => Promise<void>
  restoreTab: (id: string) => Promise<void>
  hardDeleteTab: (id: string) => Promise<void>
  clearTrash: () => Promise<void>
  updateTabMeta: (id: string, patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }) => Promise<void>
}

export function useSavedTabs(): UseSavedTabsResult {
  const [savedTabs, setSavedTabs] = useState<SavedTab[]>([])
  const [loadingSaved, setLoadingSaved] = useState(true)
  const [savedError, setSavedError] = useState<string | null>(null)

  const loadSavedTabs = useCallback(async () => {
    setLoadingSaved(true)
    setSavedError(null)
    try {
      setSavedTabs(await listSavedTabs())
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : '读取收纳数据失败。')
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  const captureTab = useCallback(
    async (tab: BrowserTab, note?: string, tag?: string, reviewStatus?: SavedTabReviewStatus) => {
      await captureBrowserTab(tab, { note, tag, reviewStatus })
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const captureAndCloseTab = useCallback(
    async (tab: BrowserTab, note?: string, tag?: string, reviewStatus?: SavedTabReviewStatus) => {
      try {
        await captureBrowserTabAndClose(tab, { note, tag, reviewStatus })
      } finally {
        await loadSavedTabs()
      }
    },
    [loadSavedTabs]
  )

  const openTab = useCallback(
    async (id: string) => {
      await openSavedTab(id)
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const deleteTab = useCallback(
    async (id: string) => {
      await deleteSavedTab(id)
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const restoreTab = useCallback(
    async (id: string) => {
      await restoreTabSvc(id)
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const hardDeleteTab = useCallback(
    async (id: string) => {
      await hardDeleteTabSvc(id)
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const clearTrash = useCallback(
    async () => {
      await clearTrashSvc()
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  const updateTabMeta = useCallback(
    async (id: string, patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }) => {
      await updateSavedTabMeta(id, patch)
      await loadSavedTabs()
    },
    [loadSavedTabs]
  )

  return {
    savedTabs,
    loadingSaved,
    savedError,
    loadSavedTabs,
    captureTab,
    captureAndCloseTab,
    openTab,
    deleteTab,
    restoreTab,
    hardDeleteTab,
    clearTrash,
    updateTabMeta,
  }
}
