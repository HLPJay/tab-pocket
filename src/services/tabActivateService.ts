import type { BrowserTab } from '../domain/browserTabTypes'
import { activateTab } from '../chrome/chromeTabsClient'

export async function activateBrowserTab(tab: BrowserTab): Promise<void> {
  if (!tab.id) {
    throw new Error('切换标签页失败：无效的标签页 ID')
  }
  try {
    await activateTab(tab.id, tab.windowId)
  } catch {
    throw new Error('切换标签页失败')
  }
}
