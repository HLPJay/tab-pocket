import {
  restoreSavedTab,
  hardDeleteSavedTab,
  clearTrash as clearTrashRepo,
} from '../repositories/storageRepository'

export async function restoreTab(id: string): Promise<void> {
  await restoreSavedTab(id)
}

export async function hardDeleteTab(id: string): Promise<void> {
  await hardDeleteSavedTab(id)
}

export async function clearTrash(): Promise<void> {
  await clearTrashRepo()
}
