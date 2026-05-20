import type { SavedTab } from './savedTabTypes'

export type StoreState = {
  version: 1
  tabs: Record<string, SavedTab>
}
