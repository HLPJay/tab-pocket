export type SavedSessionStatus = 'active' | 'archived' | 'deleted'

export type SavedSession = {
  id: string
  name: string
  tabIds: string[]

  capturedAt: number
  updatedAt: number
  lastRestoredAt?: number
  deletedAt?: number

  status: SavedSessionStatus

  note?: string
}
