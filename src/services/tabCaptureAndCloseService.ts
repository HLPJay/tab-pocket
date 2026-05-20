import type { BrowserTab } from '../domain/browserTabTypes'
import type { SavedTab } from '../domain/savedTabTypes'
import { isCollectibleUrl } from './urlFilterService'
import { captureBrowserTab } from './tabCaptureService'
import { closeTab } from '../chrome/chromeTabsClient'

export async function captureBrowserTabAndClose(
  tab: BrowserTab,
  options?: { note?: string }
): Promise<SavedTab> {
  if (!isCollectibleUrl(tab.url)) {
    throw new Error(`URL 不可收纳: ${tab.url}`)
  }

  if (tab.pinned) {
    throw new Error('固定标签不可关闭')
  }

  // Save first — NEVER close before save succeeds
  const saved = await captureBrowserTab(tab, { note: options?.note })

  // Close after save — failure here does NOT roll back the saved data
  await closeTab(tab.id)

  return saved
}
