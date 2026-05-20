import type { SavedTabReviewStatus } from '../domain/savedTabTypes'
import { getStore, saveStore } from '../repositories/storageRepository'

export async function updateSavedTabMeta(
  id: string,
  patch: {
    note?: string
    tag?: string
    reviewStatus?: SavedTabReviewStatus
  }
): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]

  if (!tab) {
    throw new Error(`找不到 SavedTab: ${id}`)
  }

  const now = Date.now()
  const trimmedNote = patch.note !== undefined ? patch.note.trim() : undefined
  const newTags =
    patch.tag !== undefined ? (patch.tag.trim() ? [patch.tag.trim()] : []) : undefined

  store.tabs[id] = {
    ...tab,
    updatedAt: now,
    ...(trimmedNote !== undefined ? { note: trimmedNote || undefined } : {}),
    ...(newTags !== undefined ? { tags: newTags } : {}),
    ...(patch.reviewStatus !== undefined ? { reviewStatus: patch.reviewStatus } : {}),
  }

  await saveStore(store)
}
