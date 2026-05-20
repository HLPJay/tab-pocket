import type { SavedTab } from '../domain/savedTabTypes'

export function isTabCurrentMemberOfSession(
  tab: SavedTab | undefined,
  sessionId: string
): tab is SavedTab {
  if (!tab) return false
  if (tab.status === 'deleted') return false
  if (tab.sessionId !== sessionId) return false
  return true
}
