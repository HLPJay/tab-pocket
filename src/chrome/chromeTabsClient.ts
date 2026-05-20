import type { BrowserTab } from '../domain/browserTabTypes'

export async function getCurrentWindowTabs(): Promise<BrowserTab[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true })

  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number; url: string } =>
      tab.id !== undefined && tab.id !== null && !!tab.url
    )
    .map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      index: tab.index,
      url: tab.url,
      title: tab.title ?? tab.url,
      favIconUrl: tab.favIconUrl,
      pinned: tab.pinned,
      active: tab.active,
    }))
    .sort((a, b) => a.index - b.index)
}
