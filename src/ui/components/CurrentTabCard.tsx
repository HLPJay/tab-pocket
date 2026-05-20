import { useEffect, useRef, useState } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SavedTab } from '../../domain/savedTabTypes'
import { getDomainFromUrl } from '../../services/urlFilterService'

type Props = {
  tab: BrowserTab
  capturedTab?: SavedTab
  duplicateOpenCount?: number
  noteExpanded: boolean
  onToggleNote: () => void
  onCollapseNote: () => void
  onActivate: (tab: BrowserTab) => Promise<void>
  onCapture: (tab: BrowserTab, note: string) => Promise<void>
  onCaptureAndClose: (tab: BrowserTab, note: string) => Promise<void>
  onCancelCapture: (id: string) => Promise<void>
  onCloseTab: (tab: BrowserTab) => Promise<void>
  onSaveNote: (id: string, note: string) => Promise<void>
}

export function CurrentTabCard({
  tab,
  capturedTab,
  duplicateOpenCount = 1,
  noteExpanded,
  onToggleNote,
  onCollapseNote,
  onActivate,
  onCapture,
  onCaptureAndClose,
  onCancelCapture,
  onCloseTab,
  onSaveNote,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [activateError, setActivateError] = useState<string | null>(null)
  const [showMoreActions, setShowMoreActions] = useState(false)
  const domain = getDomainFromUrl(tab.url)
  const isCaptured = capturedTab !== undefined
  const isActive = tab.active

  const prevExpandedRef = useRef(noteExpanded)
  useEffect(() => {
    const wasExpanded = prevExpandedRef.current
    prevExpandedRef.current = noteExpanded
    if (noteExpanded && !wasExpanded && capturedTab && !note) {
      setNote(capturedTab.note ?? '')
    }
  })

  const mousedownRef = useRef(false)

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

  const handleCloseTab = async () => {
    setBusy(true)
    setError(null)
    try {
      await onCloseTab(tab)
    } catch (e) {
      setError(e instanceof Error ? e.message : '关闭失败')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveNote = async () => {
    if (!capturedTab) return
    setBusy(true)
    setError(null)
    try {
      await onSaveNote(capturedTab.id, note)
      onCollapseNote()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存备注失败')
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

  const handleNoteBlur = () => {
    if (mousedownRef.current) return
    if (!note.trim()) {
      onCollapseNote()
    }
  }

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCollapseNote()
    }
  }

  const closeDisabled = tab.pinned
  const closeTitle = closeDisabled ? '固定标签不可关闭' : undefined

  const noteButtonLabel = noteExpanded
    ? '收起备注'
    : isCaptured
      ? '编辑备注'
      : note
        ? '编辑备注'
        : '添加备注'

  return (
    <div
      style={{
        ...styles.card,
        ...(isActive ? styles.activeCard : null),
      }}
      onMouseDown={() => {
        mousedownRef.current = false
      }}
    >
      <div style={styles.titleRow}>
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
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <span style={styles.title}>{tab.title}</span>
        </div>
        <div style={styles.badges}>
          {tab.active && <span style={{ ...styles.badge, ...styles.activeBadge }}>当前</span>}
          {isCaptured && <span style={{ ...styles.badge, ...styles.capturedBadge }}>已收纳</span>}
        </div>
      </div>

      <div style={styles.controlRow}>
        <div style={styles.leftControls}>
          <span
            style={styles.domain}
            onClick={handleActivate}
            title="切换到这个标签页"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
          >
            {domain}
          </span>
          <button
            onClick={onToggleNote}
            disabled={busy}
            style={busy ? styles.btnSecondaryDisabled : styles.btnNote}
          >
            {noteButtonLabel}
          </button>
          {isCaptured && noteExpanded && (
            <button
              onClick={handleSaveNote}
              disabled={busy}
              style={busy ? styles.btnDisabled : styles.btnSecondary}
            >
              {busy ? '处理中…' : '保存备注'}
            </button>
          )}
        </div>

        <div style={styles.primaryActions}>
          {!isCaptured && (
            <>
              <button
                onClick={handleCapture}
                disabled={busy}
                style={busy ? styles.btnDisabled : styles.btnPrimary}
              >
                收纳
              </button>
              <button
                onClick={() => setShowMoreActions((v) => !v)}
                disabled={busy}
                style={busy ? styles.btnDisabled : styles.btnMore}
              >
                更多
              </button>
            </>
          )}
          {isCaptured && (
            <button
              onClick={() => setShowMoreActions((v) => !v)}
              disabled={busy}
              style={busy ? styles.btnDisabled : styles.btnMore}
            >
              更多
            </button>
          )}
        </div>
      </div>

      {showMoreActions && (
        <div style={styles.moreActionsRow}>
          {!isCaptured ? (
            <>
              <button
                onClick={handleCaptureAndClose}
                disabled={busy || closeDisabled}
                style={busy || closeDisabled ? styles.btnDangerDisabled : styles.btnDanger}
                title={closeTitle}
              >
                收纳并关闭
              </button>
              <button
                onClick={handleCloseTab}
                disabled={busy || closeDisabled}
                style={busy || closeDisabled ? styles.btnDangerDisabled : styles.btnDanger}
                title={closeTitle}
              >
                关闭当前页
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelCapture}
                disabled={busy}
                style={busy ? styles.btnDangerDisabled : styles.btnDanger}
              >
                取消收纳
              </button>
              <button
                onClick={handleCloseTab}
                disabled={busy || closeDisabled}
                style={busy || closeDisabled ? styles.btnDangerDisabled : styles.btnDanger}
                title={closeTitle}
              >
                关闭当前页
              </button>
            </>
          )}
        </div>
      )}

      {noteExpanded && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
          onKeyDown={handleNoteKeyDown}
          placeholder="写点备注，方便之后回顾这个网页"
          style={styles.noteInput}
          rows={2}
          autoFocus
        />
      )}

      {duplicateOpenCount > 1 && (
        <div style={styles.duplicateHint}>同一页面已打开 {duplicateOpenCount} 个</div>
      )}

      {activateError && <div style={styles.activateError}>{activateError}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {closeDisabled && <div style={styles.hint}>固定标签不可关闭</div>}
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
    background: '#fff',
    borderLeft: '4px solid transparent',
  },
  activeCard: {
    background: '#eff6ff',
    borderLeftColor: '#2563eb',
    boxShadow: 'inset 0 0 0 1px rgba(37, 99, 235, 0.14)',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  badges: {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    flexShrink: 0,
    fontSize: 10,
    padding: '1px 6px',
    borderRadius: 999,
    background: '#e5e7eb',
    color: '#6b7280',
  },
  activeBadge: {
    background: '#dbeafe',
    color: '#1d4ed8',
    border: '1px solid #93c5fd',
  },
  capturedBadge: {
    background: '#d1fae5',
    color: '#065f46',
  },
  controlRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    minWidth: 0,
  },
  domain: {
    fontSize: 11,
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
  primaryActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
    flexShrink: 0,
  },
  moreActionsRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 2,
    flexWrap: 'wrap',
  },
  duplicateHint: {
    fontSize: 11,
    color: '#d97706',
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
    background: '#fff',
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
  btnNote: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
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
  btnSecondary: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
  },
  btnMore: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
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
  btnSecondaryDisabled: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  btnDangerDisabled: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
