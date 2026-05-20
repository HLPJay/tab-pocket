import { normalizeOrphanedSessionTabs } from '../repositories/storageRepository'
import { normalizeDuplicateSavedTabs } from './savedTabDedupService'

export async function normalizeStore(): Promise<void> {
  await normalizeOrphanedSessionTabs()
  await normalizeDuplicateSavedTabs()
}
