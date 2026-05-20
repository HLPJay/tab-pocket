import { useState, useEffect, useRef } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SavedTab } from '../../domain/savedTabTypes'
import { getDomainFromUrl } from '../../services/urlFilterService'

type Props = {
  tab: BrowserTab
  capturedTab?: SavedTab
  noteExpanded: boolean
  onToggleNote: () => void
  onCollapseNote: () => void
  onActivate: (tab: BrowserTab) => Promise<void>
  onCapture: (tab: BrowserTab, note: string) => Promise<void>
  onCaptureAndClose: (tab: BrowserTab, note: string) => Promise<void>
  onCancelCapture: (id: string) => Promise<void>
}

export function CurrentTabCard({
  tab,
  capturedTab,
  noteExpanded,
  onToggleNote,
  onCollapseNote,
  onActivate,
  onCapture,
  onCaptureAndClose,
  onCancelCapture,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [activateError, setActivateError] = useState<string | null>(null)
  const domain = getDomainFromUrl(tab.url)
  const isCaptured = capturedTab !== undefined

  // Pre-fill note from capturedTab when expanding in captured state
  const prevExpandedRef = useRef(noteExpanded)
  useEffect(() => {
    const wasExpanded = prevExpandedRef.current
    prevExpandedRef.current = noteExpanded
    if (noteExpanded && !wasExpanded && capturedTab && !note) {
      setNote(capturedTab.note ?? '')
    }
  })

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
      setError(e instanceof Error ? e.message : '关闭失败')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelCapture = async () => {
    if (!capturedTab) return
    setBusy(true)
    setError(null)
    try {
      await onCancelCapture(capturedTab.id)
      setNote('')
      onCollapseNote()
    } catch (e) {
      setError(e instanceof Error ? e.message : '取消收纳失败')
    } finally {
      setBusy(false)
    }
  }

  const handleActivate = async () => {
    setActivateError(null)
    try {
      await onActivate(tab)
    } catch (e) {
      setActivateError(e instanceof Error ? e.message : '切换标签页失败')
    }
  }

  const closeDisabled = tab.pinned

  // Note button label
  const noteButtonLabel = noteExpanded
    ? '收起备注'
    : isCaptured
      ? '编辑备注'
      : note
        ? '编辑备注'
        : '添加备注'

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div
          style={styles.tabInfo}
          onClick={handleActivate}
          title="切换到这个标签页"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
        >
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
          <span style={styles.title}>{tab.title}</span>
        </div>
        {tab.pinned && <span style={styles.badge}>固定</span>}
        {tab.active && <span style={{ ...styles.badge, ...styles.activeBadge }}>当前</span>}
        {isCaptured && <span style={{ ...styles.badge, ...styles.capturedBadge }}>已收纳</span>}
      </div>
      <div
        style={styles.domain}
        onClick={handleActivate}
        title="切换到这个标签页"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
      >
        {domain}
      </div>
      {activateError && <div style={styles.activateError}>{activateError}</div>}

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
        {/* Note toggle — always present */}
        <button
          onClick={onToggleNote}
          disabled={busy}
          style={busy ? styles.btnDisabled : styles.btnNote}
        >
          {noteButtonLabel}
        </button>

        {isCaptured ? (
          <>
            {/* Captured state: save note (when expanded) or just the action buttons */}
            {noteExpanded && (
              <button
                onClick={handleCapture}
                disabled={busy}
                style={busy ? styles.btnDisabled : styles.btn}
              >
                {busy ? '处理中…' : '保存备注'}
              </button>
            )}
            <button
              onClick={handleCancelCapture}
              disabled={busy}
              style={busy ? styles.btnDisabled : styles.btnDanger}
            >
              {busy ? '处理中…' : '取消收纳'}
            </button>
            <button
              onClick={handleCaptureAndClose}
              disabled={busy || closeDisabled}
              style={busy || closeDisabled ? styles.btnDisabled : styles.btn}
              title={closeDisabled ? '固定标签不可关闭' : undefined}
            >
              {busy ? '处理中…' : '关闭'}
            </button>
          </>
        ) : (
          <>
            {/* Uncaptured state */}
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
          </>
        )}
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
  tabInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
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
    cursor: 'pointer',
  },
  activateError: {
    fontSize: 11,
    color: '#dc2626',
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
  btnDanger: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
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
