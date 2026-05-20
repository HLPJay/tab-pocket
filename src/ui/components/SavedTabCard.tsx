import { useState } from 'react'
import type { SavedTab, SavedTabReviewStatus } from '../../domain/savedTabTypes'
import { PRESET_TAGS } from '../../services/tagSuggestionService'
import { InlineNoteEditor } from './InlineNoteEditor'

type Props = {
  tab: SavedTab
  onOpen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdateMeta?: (id: string, patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }) => Promise<void>
}

const REVIEW_LABEL: Record<SavedTabReviewStatus, string> = {
  unprocessed: '未处理',
  processing: '处理中',
  reviewed: '已回顾',
}

const REVIEW_OPTIONS: Array<{ value: SavedTabReviewStatus; label: string }> = [
  { value: 'unprocessed', label: '未处理' },
  { value: 'processing', label: '处理中' },
  { value: 'reviewed', label: '已回顾' },
]

export function SavedTabCard({ tab, onOpen, onDelete, onUpdateMeta }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectiveStatus: SavedTabReviewStatus = tab.reviewStatus ?? 'unprocessed'
  const tagLabel = tab.tags[0] ?? ''

  const handleOpen = async () => {
    setBusy(true)
    setError(null)
    try {
      await onOpen(tab.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开失败')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    setError(null)
    try {
      await onDelete(tab.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
      setBusy(false)
    }
  }

  const handleReviewStatusChange = async (rs: SavedTabReviewStatus) => {
    if (!onUpdateMeta) return
    try {
      await onUpdateMeta(tab.id, { reviewStatus: rs })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const handleTagChange = async (tag: string) => {
    if (!onUpdateMeta) return
    try {
      await onUpdateMeta(tab.id, { tag })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    }
  }

  const handleNoteSave = async (note: string) => {
    if (!onUpdateMeta) return
    await onUpdateMeta(tab.id, { note })
  }

  return (
    <div style={styles.card}>
      <div style={styles.title} title={tab.title}>{tab.title}</div>
      <div style={styles.metaRow}>
        {onUpdateMeta ? (
          <select
            value={tagLabel}
            onChange={(e) => handleTagChange(e.target.value)}
            style={styles.tagSelect}
            disabled={busy}
          >
            <option value="">无标签</option>
            {PRESET_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          tagLabel && <span style={styles.tag}>#{tagLabel}</span>
        )}
        {onUpdateMeta ? (
          <select
            value={effectiveStatus}
            onChange={(e) => handleReviewStatusChange(e.target.value as SavedTabReviewStatus)}
            style={styles.statusSelect}
            disabled={busy}
          >
            {REVIEW_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <span style={styles.reviewBadge}>{REVIEW_LABEL[effectiveStatus]}</span>
        )}
        {onUpdateMeta && (
          <InlineNoteEditor
            note={tab.note}
            disabled={busy}
            onSave={handleNoteSave}
            compact
            hideSummary
          />
        )}
      </div>
      {tab.note && <div style={styles.note}>{tab.note}</div>}
      <div style={styles.meta}>
        <span style={styles.domain}>{tab.domain}</span>
        <span style={styles.dot}>·</span>
        <span style={styles.time}>{new Date(tab.capturedAt).toLocaleString()}</span>
        {tab.openCount > 0 && (
          <>
            <span style={styles.dot}>·</span>
            <span>已打开 {tab.openCount} 次</span>
          </>
        )}
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button onClick={handleOpen} disabled={busy} style={styles.btnPrimary}>打开</button>
        <button onClick={handleDelete} disabled={busy} style={styles.btnDanger}>删除</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 10,
    color: '#6366f1',
  },
  tagSelect: {
    fontSize: 10,
    padding: '1px 3px',
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#6366f1',
    fontFamily: 'inherit',
  },
  reviewBadge: {
    fontSize: 10,
    color: '#9ca3af',
  },
  statusSelect: {
    fontSize: 10,
    padding: '1px 3px',
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#6b7280',
    fontFamily: 'inherit',
  },
  note: {
    fontSize: 11,
    color: '#6b7280',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#9ca3af',
    flexWrap: 'wrap',
  },
  domain: { color: '#6b7280' },
  dot: {},
  time: {},
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  btnPrimary: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #3b82f6',
    background: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  btnDanger: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
    cursor: 'pointer',
  },
}
