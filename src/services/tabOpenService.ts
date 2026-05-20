import { getStore, markSavedTabOpened } from '../repositories/storageRepository'

export async function openSavedTab(id: string): Promise<void> {
  const store = await getStore()
  const tab = store.tabs[id]

  if (!tab) throw new Error(`未找到收纳记录: ${id}`)
  if (tab.status === 'deleted') throw new Error(`该网页已在回收站，无法打开: ${id}`)

  await chrome.tabs.create({ url: tab.url })
  await markSavedTabOpened(id)
}
