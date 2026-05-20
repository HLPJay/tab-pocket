import { useState } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import { getDomainFromUrl } from '../../services/urlFilterService'

type Props = {
  tab: BrowserTab
  isCaptured: boolean
  noteExpanded: boolean
  onToggleNote: () => void
  onCollapseNote: () => void
  onCapture: (tab: BrowserTab, note: string) => Promise<void>
  onCaptureAndClose: (tab: BrowserTab, note: string) => Promise<void>
}

export function CurrentTabCard({
  tab,
  isCaptured,
  noteExpanded,
  onToggleNote,
  onCollapseNote,
  onCapture,
  onCaptureAndClose,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const domain = getDomainFromUrl(tab.url)

  const handleCapture = async () => {
    setBusy(true)
    setError(null)
    try {
      await onCapture(tab, note)
      setNote('')
      onCollapseNote()
    } catch (e) {
      setError(e instanceof Error ? e.message : '收纳失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCaptureAndClose = async () => {
    setBusy(true)
    setError(null)
    try {
      await onCaptureAndClose(tab, note)
      setNote('')
      onCollapseNote()
    } catch (e) {
      setError(e instanceof Error ? e.message : '收纳并关闭失败')
    } finally {
      setBusy(false)
    }
  }

  const closeDisabled = tab.pinned
  const noteButtonLabel = noteExpanded ? '收起备注' : note ? '编辑备注' : '添加备注'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        {tab.favIconUrl && (
          <img
            src={tab.favIconUrl}
            alt=""
            width={16}
            height={16}
            style={styles.favicon}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span style={styles.title} title={tab.title}>{tab.title}</span>
        {tab.pinned && <span style={styles.badge}>固定</span>}
        {tab.active && <span style={{ ...styles.badge, ...styles.activeBadge }}>当前</span>}
        {isCaptured && <span style={{ ...styles.badge, ...styles.capturedBadge }}>已收纳</span>}
      </div>
      <div style={styles.domain} title={tab.url}>{domain}</div>
      {noteExpanded && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="写点备注，方便之后回顾这个网页"
          style={styles.noteInput}
          rows={2}
          autoFocus
        />
      )}
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button
          onClick={onToggleNote}
          disabled={busy}
          style={busy ? styles.btnDisabled : styles.btnNote}
        >
          {noteButtonLabel}
        </button>
        <button
          onClick={handleCapture}
          disabled={busy}
          style={busy ? styles.btnDisabled : styles.btn}
        >
          {busy ? '处理中…' : '收纳'}
        </button>
        <button
          onClick={handleCaptureAndClose}
          disabled={busy || closeDisabled}
          style={busy || closeDisabled ? styles.btnDisabled : styles.btn}
          title={closeDisabled ? '固定标签不可关闭' : undefined}
        >
          {busy ? '处理中…' : '收纳并关闭'}
        </button>
      </div>
      {closeDisabled && (
        <div style={styles.hint}>固定标签不可关闭</div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  favicon: {
    flexShrink: 0,
    borderRadius: 2,
  },
  title: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
    fontWeight: 500,
    color: '#111827',
  },
  badge: {
    flexShrink: 0,
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 4,
    background: '#e5e7eb',
    color: '#6b7280',
  },
  activeBadge: {
    background: '#dbeafe',
    color: '#1d4ed8',
  },
  capturedBadge: {
    background: '#d1fae5',
    color: '#065f46',
  },
  domain: {
    fontSize: 11,
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  noteInput: {
    width: '100%',
    fontSize: 12,
    padding: '5px 7px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    resize: 'none',
    fontFamily: 'inherit',
    color: '#374151',
    lineHeight: 1.4,
    boxSizing: 'border-box',
    outline: 'none',
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
  hint: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  btnNote: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
  },
  btn: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #6366f1',
    background: '#eef2ff',
    color: '#4338ca',
    cursor: 'pointer',
  },
  btnDisabled: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
