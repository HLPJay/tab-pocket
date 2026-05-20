import type { BrowserTab } from '../domain/browserTabTypes'
import type { SavedTab, SavedTabReviewStatus } from '../domain/savedTabTypes'
import { isCollectibleUrl, getDomainFromUrl } from './urlFilterService'
import { normalizeUrl } from './urlNormalizeService'
import { getStore, saveStore } from '../repositories/storageRepository'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export async function captureBrowserTab(
  tab: BrowserTab,
  options?: {
    note?: string
    sessionId?: string
    tag?: string
    reviewStatus?: SavedTabReviewStatus
  }
): Promise<SavedTab> {
  if (!isCollectibleUrl(tab.url)) {
    throw new Error(`URL 不可收纳: ${tab.url}`)
  }

  const normalized = normalizeUrl(tab.url)
  const store = await getStore()
  const now = Date.now()
  const trimmedNote = options?.note?.trim() || undefined
  const sessionId = options?.sessionId
  const tag = options?.tag
  const reviewStatus = options?.reviewStatus
  const newTags = tag !== undefined ? (tag.trim() ? [tag.trim()] : []) : undefined

  const existing = Object.values(store.tabs).find((t) => t.normalizedUrl === normalized)

  if (existing) {
    if (existing.status !== 'deleted') {
      const updated: SavedTab = {
        ...existing,
        updatedAt: now,
        ...(trimmedNote !== undefined ? { note: trimmedNote } : {}),
        ...(sessionId !== undefined ? { sessionId } : {}),
        ...(newTags !== undefined ? { tags: newTags } : {}),
        ...(reviewStatus !== undefined ? { reviewStatus } : {}),
      }
      store.tabs[existing.id] = updated
      await saveStore(store)
      return updated
    }
    const restored: SavedTab = {
      ...existing,
      status: 'inbox',
      deletedAt: undefined,
      updatedAt: now,
      ...(trimmedNote !== undefined ? { note: trimmedNote } : {}),
      ...(sessionId !== undefined ? { sessionId } : {}),
      ...(newTags !== undefined ? { tags: newTags } : {}),
      ...(reviewStatus !== undefined ? { reviewStatus } : {}),
    }
    store.tabs[existing.id] = restored
    await saveStore(store)
    return restored
  }

  const saved: SavedTab = {
    id: generateId(),
    url: tab.url,
    normalizedUrl: normalized,
    title: tab.title,
    domain: getDomainFromUrl(tab.url),
    favIconUrl: tab.favIconUrl,
    sourceWindowId: tab.windowId,
    sourceTabId: tab.id,
    sourceTabIndex: tab.index,
    sourcePinned: tab.pinned,
    capturedAt: now,
    updatedAt: now,
    openCount: 0,
    status: 'inbox',
    tags: newTags ?? [],
    reviewStatus: reviewStatus ?? 'unprocessed',
    ...(trimmedNote !== undefined ? { note: trimmedNote } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
  }

  store.tabs[saved.id] = saved
  await saveStore(store)
  return saved
}
