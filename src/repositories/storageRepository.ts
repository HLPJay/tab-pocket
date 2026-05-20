import type { StoreState } from '../domain/storeTypes'
import type { SavedTab } from '../domain/savedTabTypes'

const STORE_KEY = 'tabPocketStore'

const emptyStore = (): StoreState => ({ version: 1, tabs: {} })

export async function getStore(): Promise<StoreState> {
  const result = await chrome.storage.local.get(STORE_KEY)
  const raw = result[STORE_KEY]
  if (!raw || typeof raw !== 'object') return emptyStore()
  return {
    version: 1,
    tabs: raw.tabs && typeof raw.tabs === 'object' ? (raw.tabs as Record<string, SavedTab>) : {},
  }
}

export async function saveStore(store: StoreState): Promise<void> {
  await chrome.storage.local.set({ [STORE_KEY]: store })
}

export async function listSavedTabs(): Promise<SavedTab[]> {
  const store = await getStore()
  return Object.values(store.tabs).sort((a, b) => b.capturedAt - a.capturedAt)
}

export async function upsertSavedTab(tab: SavedTab): Promise<SavedTab> {
  const store = await getStore()
  store.tabs[tab.id] = tab
  await saveStore(store)
  return tab
}

export async function softDeleteSavedTab(id: string): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]
  if (!tab) return
  const now = Date.now()
  store.tabs[id] = { ...tab, status: 'deleted', deletedAt: now, updatedAt: now }
  await saveStore(store)
}

export async function markSavedTabOpened(id: string): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]
  if (!tab) return
  const now = Date.now()
  store.tabs[id] = { ...tab, lastOpenedAt: now, openCount: tab.openCount + 1, updatedAt: now }
  await saveStore(store)
}
