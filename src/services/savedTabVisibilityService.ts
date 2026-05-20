import type { SavedTab } from '../domain/savedTabTypes'
import type { SavedSession } from '../domain/sessionTypes'

export function isActiveSession(
  sessionId: string | undefined,
  sessionsById: Record<string, SavedSession>
): boolean {
  if (!sessionId) return false
  const session = sessionsById[sessionId]
  if (!session) return false
  return session.status === 'active'
}

export function isEffectiveCapturedTab(
  tab: SavedTab,
  sessionsById: Record<string, SavedSession>
): boolean {
  if (tab.status === 'deleted') return false
  if (!tab.sessionId) return true
  return isActiveSession(tab.sessionId, sessionsById)
}

export function isUngroupedInboxTab(
  tab: SavedTab,
  sessionsById: Record<string, SavedSession>
): boolean {
  if (tab.status !== 'inbox') return false
  if (!tab.sessionId) return true
  // Has a sessionId — only show in ungrouped if session is missing or deleted
  // (these are orphans; normally they should be cleaned up by normalize)
  // Per spec: tab with sessionId is NOT ungrouped regardless
  return false
}

export function isOrphanedSessionTab(
  tab: SavedTab,
  sessionsById: Record<string, SavedSession>
): boolean {
  if (tab.status === 'deleted') return false
  if (!tab.sessionId) return false
  return !isActiveSession(tab.sessionId, sessionsById)
}
