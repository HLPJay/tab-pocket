import type { SavedTab } from './savedTabTypes'
import type { SavedSession } from './sessionTypes'

export type StoreState = {
  version: 1
  tabs: Record<string, SavedTab>
  sessions: Record<string, SavedSession>
}
