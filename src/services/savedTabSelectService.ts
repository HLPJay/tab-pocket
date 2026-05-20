import type { SavedTab } from '../domain/savedTabTypes'
import type { SavedSession } from '../domain/sessionTypes'
import { isEffectiveCapturedTab } from './savedTabVisibilityService'

export function selectCapturedTabsByNormalizedUrl(
  tabs: SavedTab[],
  sessionsById: Record<string, SavedSession>
): Map<string, SavedTab> {
  const result = new Map<string, SavedTab>()

  for (const tab of tabs) {
    if (!isEffectiveCapturedTab(tab, sessionsById)) continue

    const existing = result.get(tab.normalizedUrl)
    if (!existing) {
      result.set(tab.normalizedUrl, tab)
      continue
    }

    if (
      tab.updatedAt > existing.updatedAt ||
      (tab.updatedAt === existing.updatedAt && tab.capturedAt > existing.capturedAt)
    ) {
      result.set(tab.normalizedUrl, tab)
    }
  }

  return result
}
