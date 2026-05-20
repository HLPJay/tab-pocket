import { useState } from 'react'
import type { SavedTab, SavedTabReviewStatus } from '../../domain/savedTabTypes'
import type { TagFilter, ReviewStatusFilter, NoteFilter, SavedTabSort } from '../../services/savedTabViewService'
import { filterAndSortSavedTabs } from '../../services/savedTabViewService'
import { PRESET_TAGS } from '../../services/tagSuggestionService'
import { SavedTabCard } from './SavedTabCard'

type Props = {
  tabs: SavedTab[]
  loading: boolean
  error: string | null
  onOpen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdateMeta: (id: string, patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }) => Promise<void>
}

const SORT_OPTIONS: Array<{ value: SavedTabSort; label: string }> = [
  { value: 'capturedAtDesc', label: '收纳时间最新' },
  { value: 'capturedAtAsc', label: '收纳时间最早' },
  { value: 'lastOpenedAtDesc', label: '最近打开' },
  { value: 'openCountDesc', label: '打开次数最多' },
  { value: 'noteFirst', label: '有备注优先' },
  { value: 'noNoteFirst', label: '无备注优先' },
  { value: 'titleAsc', label: '标题 A-Z' },
]

export function InboxList({ tabs, loading, error, onOpen, onDelete, onUpdateMeta }: Props) {
  const [tagFilter, setTagFilter] = useState<TagFilter>('all')
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>('all')
  const [noteFilter, setNoteFilter] = useState<NoteFilter>('all')
  const [sort, setSort] = useState<SavedTabSort>('capturedAtDesc')

  if (loading) return <div style={styles.state}>正在读取…</div>
  if (error) return <div style={{ ...styles.state, ...styles.error }}>{error}</div>

  const filtered = filterAndSortSavedTabs(tabs, { tagFilter, reviewStatusFilter, noteFilter, sort })

  return (
    <div>
      <div style={styles.filters}>
        <label style={styles.filterItem}>
          <span style={styles.filterLabel}>标签</span>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value as TagFilter)}
            style={styles.select}
          >
            <option value="all">全部</option>
            <option value="none">无标签</option>
            {PRESET_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={styles.filterItem}>
          <span style={styles.filterLabel}>状态</span>
          <select
            value={reviewStatusFilter}
            onChange={(e) => setReviewStatusFilter(e.target.value as ReviewStatusFilter)}
            style={styles.select}
          >
            <option value="all">全部</option>
            <option value="unprocessed">未处理</option>
            <option value="processing">处理中</option>
            <option value="reviewed">已回顾</option>
          </select>
        </label>
        <label style={styles.filterItem}>
          <span style={styles.filterLabel}>备注</span>
          <select
            value={noteFilter}
            onChange={(e) => setNoteFilter(e.target.value as NoteFilter)}
            style={styles.select}
          >
            <option value="all">全部</option>
            <option value="withNote">有备注</option>
            <option value="withoutNote">无备注</option>
          </select>
        </label>
        <label style={styles.filterItem}>
          <span style={styles.filterLabel}>排序</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SavedTabSort)}
            style={styles.select}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? (
        <div style={styles.state}>
          {tabs.length === 0 ? '暂无未分组收纳的网页' : '没有匹配的网页'}
        </div>
      ) : (
        filtered.map((tab) => (
          <SavedTabCard
            key={tab.id}
            tab={tab}
            onOpen={onOpen}
            onDelete={onDelete}
            onUpdateMeta={onUpdateMeta}
          />
        ))
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  state: {
    padding: '16px',
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
  error: { color: '#dc2626' },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    padding: '6px 12px',
    borderBottom: '1px solid #f3f4f6',
    background: '#fafafa',
  },
  filterItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  filterLabel: {
    flexShrink: 0,
  },
  select: {
    fontSize: 11,
    padding: '2px 4px',
    borderRadius: 3,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontFamily: 'inherit',
  },
}
