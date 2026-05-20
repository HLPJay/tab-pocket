import { getStore, saveStore } from '../repositories/storageRepository'
import type { SavedTabReviewStatus } from '../domain/savedTabTypes'

const REVIEW_RANK: Record<string, number> = { unprocessed: 0, processing: 1, reviewed: 2 }
const REVIEW_STATUS: SavedTabReviewStatus[] = ['unprocessed', 'processing', 'reviewed']

export async function normalizeDuplicateSavedTabs(): Promise<void> {
  const store = await getStore()
  const now = Date.now()
  let changed = false

  // Group non-deleted tabs by normalizedUrl
  const groups = new Map<string, string[]>()
  for (const [id, tab] of Object.entries(store.tabs)) {
    if (tab.status === 'deleted') continue
    const arr = groups.get(tab.normalizedUrl) ?? []
    arr.push(id)
    groups.set(tab.normalizedUrl, arr)
  }

  for (const [, ids] of groups) {
    if (ids.length <= 1) continue

    // Pick canonical: highest updatedAt, then highest capturedAt
    ids.sort((a, b) => {
      const ta = store.tabs[a], tb = store.tabs[b]
      if (tb.updatedAt !== ta.updatedAt) return tb.updatedAt - ta.updatedAt
      return tb.capturedAt - ta.capturedAt
    })

    const canonicalId = ids[0]
    const canonical = store.tabs[canonicalId]
    const duplicates = ids.slice(1)

    // Merge fields from duplicates into canonical
    let mergedNote = canonical.note ?? ''
    const mergedTags = new Set(canonical.tags)
    let mergedReviewRank = REVIEW_RANK[canonical.reviewStatus ?? 'unprocessed'] ?? 0
    let mergedOpenCount = canonical.openCount
    let mergedLastOpenedAt = canonical.lastOpenedAt ?? 0

    for (const dupId of duplicates) {
      const dup = store.tabs[dupId]
      if (!mergedNote && dup.note) mergedNote = dup.note
      for (const tag of dup.tags) mergedTags.add(tag)
      const dupRank = REVIEW_RANK[dup.reviewStatus ?? 'unprocessed'] ?? 0
      if (dupRank > mergedReviewRank) mergedReviewRank = dupRank
      mergedOpenCount += dup.openCount
      if ((dup.lastOpenedAt ?? 0) > mergedLastOpenedAt) mergedLastOpenedAt = dup.lastOpenedAt ?? 0
    }

    store.tabs[canonicalId] = {
      ...canonical,
      note: mergedNote || undefined,
      tags: Array.from(mergedTags),
      reviewStatus: REVIEW_STATUS[mergedReviewRank],
      openCount: mergedOpenCount,
      lastOpenedAt: mergedLastOpenedAt || undefined,
      updatedAt: now,
    }

    // Soft-delete duplicates
    for (const dupId of duplicates) {
      store.tabs[dupId] = { ...store.tabs[dupId], status: 'deleted', deletedAt: now, updatedAt: now }
    }

    // Fix active session tabIds: replace duplicate ids with canonical, no duplicates
    const dupSet = new Set(duplicates)
    for (const sessionId of Object.keys(store.sessions)) {
      const session = store.sessions[sessionId]
      if (session.status !== 'active') continue
      if (!session.tabIds.some((tid) => dupSet.has(tid))) continue

      const seen = new Set<string>()
      const newTabIds: string[] = []
      for (const tid of session.tabIds) {
        const resolved = dupSet.has(tid) ? canonicalId : tid
        if (!seen.has(resolved)) {
          seen.add(resolved)
          newTabIds.push(resolved)
        }
      }
      store.sessions[sessionId] = { ...session, tabIds: newTabIds, updatedAt: now }
    }

    changed = true
  }

  if (changed) await saveStore(store)
}
