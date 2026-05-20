import type { StoreState } from '../domain/storeTypes'
import type { SavedTab } from '../domain/savedTabTypes'
import type { SavedSession } from '../domain/sessionTypes'

const STORE_KEY = 'tabPocketStore'

const emptyStore = (): StoreState => ({ version: 1, tabs: {}, sessions: {} })

export async function getStore(): Promise<StoreState> {
  const result = await chrome.storage.local.get(STORE_KEY)
  const raw = result[STORE_KEY]
  if (!raw || typeof raw !== 'object') return emptyStore()
  return {
    version: 1,
    tabs: raw.tabs && typeof raw.tabs === 'object' ? (raw.tabs as Record<string, SavedTab>) : {},
    sessions:
      raw.sessions && typeof raw.sessions === 'object'
        ? (raw.sessions as Record<string, SavedSession>)
        : {},
  }
}

export async function saveStore(store: StoreState): Promise<void> {
  await chrome.storage.local.set({ [STORE_KEY]: store })
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

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

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function listSavedSessions(): Promise<SavedSession[]> {
  const store = await getStore()
  return Object.values(store.sessions).sort((a, b) => b.capturedAt - a.capturedAt)
}

export async function upsertSavedSession(session: SavedSession): Promise<SavedSession> {
  const store = await getStore()
  store.sessions[session.id] = session
  await saveStore(store)
  return session
}

export async function softDeleteSavedSession(id: string): Promise<void> {
  const store = await getStore()
  const session = store.sessions[id]
  if (!session) return
  const now = Date.now()
  store.sessions[id] = { ...session, status: 'deleted', deletedAt: now, updatedAt: now }
  await saveStore(store)
}

// ── Trash operations ──────────────────────────────────────────────────────────

export async function restoreSavedTab(id: string): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]
  if (!tab) return
  if (tab.status !== 'deleted') return

  const now = Date.now()

  // Keep sessionId only if the referenced session is still active
  let sessionId = tab.sessionId
  if (sessionId) {
    const session = store.sessions[sessionId]
    if (!session || session.status !== 'active') {
      sessionId = undefined
    }
  }

  store.tabs[id] = {
    ...tab,
    status: 'inbox',
    deletedAt: undefined,
    updatedAt: now,
    sessionId,
  }
  await saveStore(store)
}

export async function hardDeleteSavedTab(id: string): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]
  if (!tab) return
  if (tab.status !== 'deleted') return
  delete store.tabs[id]
  await saveStore(store)
}

export async function clearTrash(): Promise<void> {
  const store = await getStore()

  for (const id of Object.keys(store.tabs)) {
    if (store.tabs[id].status === 'deleted') {
      delete store.tabs[id]
    }
  }

  for (const id of Object.keys(store.sessions)) {
    if (store.sessions[id].status === 'deleted') {
      delete store.sessions[id]
    }
  }

  await saveStore(store)
}
