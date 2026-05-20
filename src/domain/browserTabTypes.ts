export type BrowserTab = {
  id: number
  windowId: number
  index: number
  url: string
  title: string
  favIconUrl?: string
  pinned: boolean
  active: boolean
}
