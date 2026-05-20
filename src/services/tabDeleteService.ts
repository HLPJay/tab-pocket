import { getStore, softDeleteSavedTab } from '../repositories/storageRepository'

export async function deleteSavedTab(id: string): Promise<void> {
  const store = await getStore()
  if (!store.tabs[id]) throw new Error(`未找到收纳记录: ${id}`)
  await softDeleteSavedTab(id)
}
