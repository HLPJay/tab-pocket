import { getStore, saveStore } from '../repositories/storageRepository'
import { createTab } from '../chrome/chromeTabsClient'

export async function openSessionTabs(sessionId: string): Promise<void> {
  const store = await getStore()
  const session = store.sessions[sessionId]

  if (!session || session.status === 'deleted') {
    throw new Error('Session 不存在或已删除')
  }

  const now = Date.now()
  let opened = 0

  for (const tabId of session.tabIds) {
    const tab = store.tabs[tabId]
    if (!tab || tab.status === 'deleted') continue

    try {
      await createTab(tab.url)
      store.tabs[tabId] = {
        ...tab,
        openCount: tab.openCount + 1,
        lastOpenedAt: now,
        updatedAt: now,
      }
      opened++
    } catch {
      // Skip tabs that fail to open — don't abort the whole operation
    }
  }

  if (opened > 0) {
    store.sessions[sessionId] = {
      ...session,
      lastRestoredAt: now,
      updatedAt: now,
    }
    await saveStore(store)
  }
}
