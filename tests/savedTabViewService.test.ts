import { describe, it, expect } from 'vitest'
import type { SavedTab } from '../src/domain/savedTabTypes'
import { filterAndSortSavedTabs } from '../src/services/savedTabViewService'

const makeTab = (overrides: Partial<SavedTab> = {}): SavedTab => ({
  id: 'tab-1',
  url: 'https://example.com',
  normalizedUrl: 'https://example.com/',
  title: 'Example',
  domain: 'example.com',
  capturedAt: 1000,
  updatedAt: 1000,
  openCount: 0,
  status: 'inbox',
  tags: [],
  ...overrides,
})

const defaults = {
  tagFilter: 'all' as const,
  reviewStatusFilter: 'all' as const,
  noteFilter: 'all' as const,
  sort: 'capturedAtDesc' as const,
}

describe('filterAndSortSavedTabs — tag filter', () => {
  const tabs = [
    makeTab({ id: 'a', tags: ['AI工具'] }),
    makeTab({ id: 'b', tags: ['开发文档'] }),
    makeTab({ id: 'c', tags: [] }),
  ]

  it('all — returns all tabs', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, tagFilter: 'all' })
    expect(result).toHaveLength(3)
  })

  it('none — returns only tabs with no tags', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, tagFilter: 'none' })
    expect(result.map((t) => t.id)).toEqual(['c'])
  })

  it('specific tag — returns matching tabs only', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, tagFilter: 'AI工具' })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })
})

describe('filterAndSortSavedTabs — reviewStatus filter', () => {
  const tabs = [
    makeTab({ id: 'a', reviewStatus: 'unprocessed' }),
    makeTab({ id: 'b', reviewStatus: 'processing' }),
    makeTab({ id: 'c', reviewStatus: 'reviewed' }),
    makeTab({ id: 'd' }), // no reviewStatus — treated as unprocessed
  ]

  it('all — returns all tabs', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, reviewStatusFilter: 'all' })
    expect(result).toHaveLength(4)
  })

  it('unprocessed — includes tabs with no reviewStatus', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, reviewStatusFilter: 'unprocessed' })
    expect(result.map((t) => t.id)).toContain('a')
    expect(result.map((t) => t.id)).toContain('d')
    expect(result).toHaveLength(2)
  })

  it('processing — returns only processing tabs', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, reviewStatusFilter: 'processing' })
    expect(result.map((t) => t.id)).toEqual(['b'])
  })

  it('reviewed — returns only reviewed tabs', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, reviewStatusFilter: 'reviewed' })
    expect(result.map((t) => t.id)).toEqual(['c'])
  })
})

describe('filterAndSortSavedTabs — note filter', () => {
  const tabs = [
    makeTab({ id: 'a', note: 'some note' }),
    makeTab({ id: 'b', note: '  ' }),
    makeTab({ id: 'c' }),
  ]

  it('all — returns all tabs', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, noteFilter: 'all' })
    expect(result).toHaveLength(3)
  })

  it('withNote — returns tabs with non-empty trimmed note', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, noteFilter: 'withNote' })
    expect(result.map((t) => t.id)).toEqual(['a'])
  })

  it('withoutNote — returns tabs without note or with blank note', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, noteFilter: 'withoutNote' })
    expect(result.map((t) => t.id)).toContain('b')
    expect(result.map((t) => t.id)).toContain('c')
  })
})

describe('filterAndSortSavedTabs — sort', () => {
  const tabs = [
    makeTab({ id: 'a', capturedAt: 1000, lastOpenedAt: 500, openCount: 3, title: 'Bravo', note: 'yes' }),
    makeTab({ id: 'b', capturedAt: 3000, lastOpenedAt: 100, openCount: 1, title: 'Alpha', note: '' }),
    makeTab({ id: 'c', capturedAt: 2000, lastOpenedAt: 800, openCount: 5, title: 'Charlie' }),
  ]

  it('capturedAtDesc — newest first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'capturedAtDesc' })
    expect(result.map((t) => t.id)).toEqual(['b', 'c', 'a'])
  })

  it('capturedAtAsc — oldest first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'capturedAtAsc' })
    expect(result.map((t) => t.id)).toEqual(['a', 'c', 'b'])
  })

  it('lastOpenedAtDesc — most recently opened first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'lastOpenedAtDesc' })
    expect(result.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('openCountDesc — most opened first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'openCountDesc' })
    expect(result.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('noteFirst — tabs with note come first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'noteFirst' })
    expect(result[0].id).toBe('a')
  })

  it('noNoteFirst — tabs without note come first', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'noNoteFirst' })
    expect(result[0].id).not.toBe('a')
  })

  it('titleAsc — alphabetical by title', () => {
    const result = filterAndSortSavedTabs(tabs, { ...defaults, sort: 'titleAsc' })
    expect(result.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('filterAndSortSavedTabs — does not mutate input', () => {
  it('returns a new array', () => {
    const tabs = [makeTab()]
    const result = filterAndSortSavedTabs(tabs, defaults)
    expect(result).not.toBe(tabs)
  })
})
