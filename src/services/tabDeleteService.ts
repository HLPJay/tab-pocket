import { softDeleteSavedTab } from '../repositories/storageRepository'

export async function deleteSavedTab(id: string): Promise<void> {
  await softDeleteSavedTab(id)
}
