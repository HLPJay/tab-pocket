import { normalizeOrphanedSessionTabs } from '../repositories/storageRepository'

export async function normalizeStore(): Promise<void> {
  await normalizeOrphanedSessionTabs()
}
