import type { BrowserTab } from '../domain/browserTabTypes'
import { closeTab } from '../chrome/chromeTabsClient'

export async function closeCurrentBrowserTab(tab: BrowserTab): Promise<void> {
  if (tab.pinned) {
    throw new Error('固定标签不可关闭')
  }
  if (!tab.id) {
    throw new Error('无效的标签页 ID')
  }
  await closeTab(tab.id)
}
