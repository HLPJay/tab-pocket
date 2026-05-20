export type SavedTabStatus = 'inbox' | 'opened' | 'archived' | 'deleted'

export type SavedTab = {
  id: string
  url: string
  normalizedUrl: string
  title: string
  domain: string
  favIconUrl?: string

  sourceWindowId?: number
  sourceTabId?: number
  sourceTabIndex?: number
  sourcePinned?: boolean

  capturedAt: number
  updatedAt: number
  lastOpenedAt?: number
  deletedAt?: number

  openCount: number
  status: SavedTabStatus

  note?: string
  sessionId?: string
  tags: string[]
}
