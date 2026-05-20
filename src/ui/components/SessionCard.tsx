import { useState } from 'react'
import type { SavedSession } from '../../domain/sessionTypes'
import type { SavedTab, SavedTabReviewStatus } from '../../domain/savedTabTypes'
import { isTabCurrentMemberOfSession } from '../../services/sessionMembershipService'
import { InlineNoteEditor } from './InlineNoteEditor'

const REVIEW_LABEL: Record<SavedTabReviewStatus, string> = {
  unprocessed: '未处理',
  processing: '处理中',
  reviewed: '已回顾',
}

type Props = {
  session: SavedSession
  tabsById: Record<string, SavedTab>
  onOpenTab: (id: string) => Promise<void>
  onDeleteTab: (id: string) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
  onOpenAll: (sessionId: string) => Promise<void>
  onUpdateTabMeta?: (
    id: string,
    patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }
  ) => Promise<void>
}

function effectiveReviewStatus(tab: SavedTab): SavedTabReviewStatus {
  return tab.reviewStatus ?? 'unprocessed'
}

export function SessionCard({
  session,
  tabsById,
  onOpenTab,
  onDeleteTab,
  onDeleteSession,
  onOpenAll,
  onUpdateTabMeta,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [busySession, setBusySession] = useState(false)
  const [busyOpenAll, setBusyOpenAll] = useState(false)
  const [busyTabId, setBusyTabId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleTabs = session.tabIds
    .map((id) => ({ id, tab: tabsById[id] }))
    .filter(({ tab }) => isTabCurrentMemberOfSession(tab, session.id)) as {
    id: string
    tab: SavedTab
  }[]

  const capturedDate = new Date(session.capturedAt).toLocaleString()

  const reviewCounts = visibleTabs.reduce(
    (acc, { tab }) => {
      const rs = effectiveReviewStatus(tab)
      acc[rs] = (acc[rs] ?? 0) + 1
      return acc
    },
    {} as Record<SavedTabReviewStatus, number>
  )

  const handleDeleteSession = async () => {
    setBusySession(true)
    setError(null)
    try {
      await onDeleteSession(session.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除 Session 失败')
      setBusySession(false)
    }
  }

  const handleOpenAll = async () => {
    const count = visibleTabs.length
    if (count > 8 && !window.confirm(`即将打开 ${count} 个网页，是否继续？`)) return
    setBusyOpenAll(true)
    setError(null)
    try {
      await onOpenAll(session.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开失败')
    } finally {
      setBusyOpenAll(false)
    }
  }

  const handleOpenTab = async (tabId: string) => {
    setBusyTabId(tabId)
    setError(null)
    try {
      await onOpenTab(tabId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打开失败')
    } finally {
      setBusyTabId(null)
    }
  }

  const handleDeleteTab = async (tabId: string) => {
    setBusyTabId(tabId)
    setError(null)
    try {
      await onDeleteTab(tabId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setBusyTabId(null)
    }
  }

  const handleUpdateTabMeta = async (tabId: string, note: string) => {
    if (!onUpdateTabMeta) return
    await onUpdateTabMeta(tabId, { note })
  }

  const reviewSummary = (['unprocessed', 'processing', 'reviewed'] as SavedTabReviewStatus[])
    .filter((rs) => reviewCounts[rs])
    .map((rs) => `${REVIEW_LABEL[rs]} ${reviewCounts[rs]}`)
    .join(' · ')

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={styles.expandBtn}
          title={expanded ? '收起' : '展开'}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <div
          style={styles.info}
          onClick={() => setExpanded((v) => !v)}
          title="点击展开 / 收起"
        >
          <div style={styles.name} title={session.name}>
            {session.name}
          </div>
          {session.note && <div style={styles.note}>{session.note}</div>}
          <div style={styles.meta}>
            {visibleTabs.length} 个网页{reviewSummary ? ` · ${reviewSummary}` : ''} · {capturedDate}
          </div>
        </div>
        <div
          style={styles.headerActions}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleOpenAll}
            disabled={busyOpenAll || busySession || visibleTabs.length === 0}
            style={busyOpenAll || busySession || visibleTabs.length === 0 ? styles.tabBtnDisabled : styles.tabBtnPrimary}
            title="打开全部网页"
          >
            {busyOpenAll ? '打开中…' : '打开全部'}
          </button>
          <button
            onClick={handleDeleteSession}
            disabled={busySession || busyOpenAll}
            style={busySession || busyOpenAll ? styles.tabBtnDisabled : styles.deleteBtnSession}
            title="删除 Session"
          >
            删除
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {expanded && (
        <div style={styles.tabList}>
          {visibleTabs.length === 0 && (
            <div style={styles.emptyTabs}>Session 内网页均已移出或删除</div>
          )}
          {visibleTabs.map(({ id, tab }) => {
            const isBusy = busyTabId === id
            const rs = effectiveReviewStatus(tab)
            const hasNote = Boolean(tab.note?.trim())
            const primaryText = hasNote ? tab.note!.trim() : tab.title
            const secondaryText = hasNote ? `${tab.title} · ${tab.domain}` : tab.domain
            return (
              <div key={id} style={styles.tabRow}>
                <div style={styles.tabTextBlock}>
                  <div style={styles.tabPrimary} title={primaryText}>
                    {primaryText}
                  </div>
                  <div style={styles.tabSecondary} title={secondaryText}>
                    {secondaryText}
                  </div>
                  <div style={styles.tabMetaLine}>
                    {tab.tags[0] && <span style={styles.tag}>#{tab.tags[0]}</span>}
                    <span style={styles.reviewBadge}>{REVIEW_LABEL[rs]}</span>
                  </div>
                </div>
                <div style={styles.tabActions}>
                  {onUpdateTabMeta && (
                    <InlineNoteEditor
                      note={tab.note}
                      disabled={isBusy}
                      onSave={(note) => handleUpdateTabMeta(id, note)}
                      compact
                      hideSummary
                    />
                  )}
                  <button
                    onClick={() => handleOpenTab(id)}
                    disabled={isBusy}
                    style={isBusy ? styles.tabBtnDisabled : styles.tabBtnPrimary}
                  >
                    打开
                  </button>
                  <button
                    onClick={() => handleDeleteTab(id)}
                    disabled={isBusy}
                    style={isBusy ? styles.tabBtnDisabled : styles.tabBtnDanger}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
  },
  expandBtn: {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#6b7280',
    padding: '0 2px',
    lineHeight: 1.4,
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    cursor: 'pointer',
  },
  name: {
    fontSize: 13,
    fontWeight: 500,
    color: '#111827',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
    fontSize: 11,
    color: '#9ca3af',
  },
  headerActions: {
    flexShrink: 0,
    display: 'flex',
    gap: 4,
    alignItems: 'flex-start',
  },
  deleteBtnSession: {
    flexShrink: 0,
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
    cursor: 'pointer',
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
    padding: '0 12px 6px',
  },
  tabList: {
    borderTop: '1px solid #f3f4f6',
    background: '#fafafa',
  },
  emptyTabs: {
    padding: '12px',
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  tabRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '7px 12px 7px 28px',
    borderBottom: '1px solid #f3f4f6',
  },
  tabTextBlock: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  tabPrimary: {
    fontSize: 13,
    fontWeight: 600,
    color: '#111827',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  tabSecondary: {
    fontSize: 11,
    color: '#6b7280',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  tabMetaLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 10,
    color: '#6366f1',
  },
  reviewBadge: {
    fontSize: 10,
    color: '#9ca3af',
  },
  tabActions: {
    flexShrink: 0,
    display: 'flex',
    gap: 4,
    alignItems: 'flex-start',
  },
  tabBtnPrimary: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    border: '1px solid #3b82f6',
    background: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  tabBtnDanger: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
    cursor: 'pointer',
  },
  tabBtnDisabled: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 3,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
