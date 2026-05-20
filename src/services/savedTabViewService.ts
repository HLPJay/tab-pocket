import type { SavedTab, SavedTabReviewStatus } from '../domain/savedTabTypes'

export type TagFilter = 'all' | 'none' | string
export type ReviewStatusFilter = 'all' | 'unprocessed' | 'processing' | 'reviewed'
export type NoteFilter = 'all' | 'withNote' | 'withoutNote'
export type SavedTabSort =
  | 'capturedAtDesc'
  | 'capturedAtAsc'
  | 'lastOpenedAtDesc'
  | 'openCountDesc'
  | 'noteFirst'
  | 'noNoteFirst'
  | 'titleAsc'

function effectiveReviewStatus(tab: SavedTab): SavedTabReviewStatus {
  return tab.reviewStatus ?? 'unprocessed'
}

export function filterAndSortSavedTabs(
  tabs: SavedTab[],
  options: {
    tagFilter: TagFilter
    reviewStatusFilter: ReviewStatusFilter
    noteFilter: NoteFilter
    sort: SavedTabSort
  }
): SavedTab[] {
  let result = tabs.slice()

  if (options.tagFilter !== 'all') {
    if (options.tagFilter === 'none') {
      result = result.filter((t) => t.tags.length === 0)
    } else {
      result = result.filter((t) => t.tags.includes(options.tagFilter as string))
    }
  }

  if (options.reviewStatusFilter !== 'all') {
    result = result.filter(
      (t) => effectiveReviewStatus(t) === options.reviewStatusFilter
    )
  }

  if (options.noteFilter === 'withNote') {
    result = result.filter((t) => !!t.note?.trim())
  } else if (options.noteFilter === 'withoutNote') {
    result = result.filter((t) => !t.note?.trim())
  }

  switch (options.sort) {
    case 'capturedAtDesc':
      result.sort((a, b) => b.capturedAt - a.capturedAt)
      break
    case 'capturedAtAsc':
      result.sort((a, b) => a.capturedAt - b.capturedAt)
      break
    case 'lastOpenedAtDesc':
      result.sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
      break
    case 'openCountDesc':
      result.sort((a, b) => b.openCount - a.openCount)
      break
    case 'noteFirst':
      result.sort((a, b) => {
        const aN = a.note?.trim() ? 0 : 1
        const bN = b.note?.trim() ? 0 : 1
        return aN - bN
      })
      break
    case 'noNoteFirst':
      result.sort((a, b) => {
        const aN = a.note?.trim() ? 1 : 0
        const bN = b.note?.trim() ? 1 : 0
        return aN - bN
      })
      break
    case 'titleAsc':
      result.sort((a, b) => a.title.localeCompare(b.title))
      break
  }

  return result
}
