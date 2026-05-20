import { useState } from 'react'
import type { SavedSession } from '../../domain/sessionTypes'
import type { SavedTab } from '../../domain/savedTabTypes'

type Props = {
  session: SavedSession
  tabsById: Record<string, SavedTab>
  onOpenTab: (id: string) => Promise<void>
  onDeleteTab: (id: string) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
}

export function SessionCard({ session, tabsById, onOpenTab, onDeleteTab, onDeleteSession }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [busySession, setBusySession] = useState(false)
  const [busyTabId, setBusyTabId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visibleTabs = session.tabIds
    .map((id) => ({ id, tab: tabsById[id] }))
    .filter(({ tab }) => tab !== undefined && tab.status !== 'deleted') as {
    id: string
    tab: SavedTab
  }[]

  const capturedDate = new Date(session.capturedAt).toLocaleString()

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
        <div style={styles.info}>
          <div style={styles.name} title={session.name}>{session.name}</div>
          {session.note && <div style={styles.note}>{session.note}</div>}
          <div style={styles.meta}>
            {session.tabIds.length} 个网页 · {capturedDate}
          </div>
        </div>
        <button
          onClick={handleDeleteSession}
          disabled={busySession}
          style={styles.deleteBtnSession}
          title="删除 Session"
        >
          删除
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {expanded && (
        <div style={styles.tabList}>
          {visibleTabs.length === 0 && (
            <div style={styles.emptyTabs}>Session 内网页均已删除</div>
          )}
          {visibleTabs.map(({ id, tab }) => {
            const isBusy = busyTabId === id
            return (
              <div key={id} style={styles.tabRow}>
                <div style={styles.tabInfo}>
                  <div style={styles.tabTitle} title={tab.title}>{tab.title}</div>
                  <div style={styles.tabDomain}>{tab.domain}</div>
                </div>
                <div style={styles.tabActions}>
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
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px 7px 28px',
    borderBottom: '1px solid #f3f4f6',
  },
  tabInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  tabTitle: {
    fontSize: 12,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tabDomain: {
    fontSize: 10,
    color: '#9ca3af',
  },
  tabActions: {
    flexShrink: 0,
    display: 'flex',
    gap: 4,
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
