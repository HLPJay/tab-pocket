import { getStore, saveStore } from '../repositories/storageRepository'

export async function deleteSessionAndTabs(sessionId: string): Promise<void> {
  const store = await getStore()
  const session = store.sessions[sessionId]

  if (!session) {
    throw new Error(`找不到 Session: ${sessionId}`)
  }

  const now = Date.now()

  store.sessions[sessionId] = {
    ...session,
    status: 'deleted',
    deletedAt: now,
    updatedAt: now,
  }

  for (const tabId of session.tabIds) {
    const tab = store.tabs[tabId]
    if (!tab) continue
    if (tab.sessionId !== sessionId) continue
    store.tabs[tabId] = {
      ...tab,
      status: 'deleted',
      deletedAt: now,
      updatedAt: now,
    }
  }

  await saveStore(store)
}
