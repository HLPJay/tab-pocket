import { useState } from 'react'
import type { SavedTab } from '../../domain/savedTabTypes'

type Props = {
  tabs: SavedTab[]
  onRestore: (id: string) => Promise<void>
  onHardDelete: (id: string) => Promise<void>
  onClearTrash: () => Promise<void>
}

export function TrashList({ tabs, onRestore, onHardDelete, onClearTrash }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const count = tabs.length

  const handleRestore = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await onRestore(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '恢复失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleHardDelete = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      await onHardDelete(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : '永久删除失败')
    } finally {
      setBusyId(null)
    }
  }

  const handleClearTrash = async () => {
    if (!window.confirm('确定清空回收站吗？此操作不可恢复。')) return
    setClearing(true)
    setError(null)
    try {
      await onClearTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : '清空失败')
    } finally {
      setClearing(false)
    }
  }

  return (
    <section>
      <div style={styles.bar}>
        <span style={styles.sectionLabel}>回收站 · {count} 项</span>
        <div style={styles.barActions}>
          {expanded && count > 0 && (
            <button
              onClick={handleClearTrash}
              disabled={clearing || busyId !== null}
              style={clearing || busyId !== null ? styles.btnDisabled : styles.btnDanger}
            >
              {clearing ? '清空中…' : '清空'}
            </button>
          )}
          {count > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              disabled={clearing || busyId !== null}
              style={clearing || busyId !== null ? styles.btnDisabled : styles.btnToggle}
            >
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {!expanded && count === 0 && (
        <div style={styles.state}>暂无删除记录</div>
      )}

      {expanded && (
        <div>
          {tabs.map((tab) => {
            const busy = busyId === tab.id
            return (
              <div key={tab.id} style={styles.card}>
                <div style={styles.title} title={tab.title}>{tab.title}</div>
                <div style={styles.meta}>
                  <span>{tab.domain}</span>
                  {tab.deletedAt && (
                    <>
                      <span style={styles.dot}>·</span>
                      <span>已删除于 {new Date(tab.deletedAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
                <div style={styles.actions}>
                  <button
                    onClick={() => handleRestore(tab.id)}
                    disabled={busy || clearing}
                    style={busy || clearing ? styles.btnDisabled : styles.btnRestore}
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => handleHardDelete(tab.id)}
                    disabled={busy || clearing}
                    style={busy || clearing ? styles.btnDisabled : styles.btnDanger}
                  >
                    永久删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px 4px',
    borderTop: '1px solid #f3f4f6',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  barActions: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  state: {
    padding: '16px',
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
  card: {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  title: {
    fontSize: 12,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'flex',
    gap: 4,
    fontSize: 11,
    color: '#9ca3af',
  },
  dot: {},
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 2,
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
    padding: '0 12px 4px',
  },
  btnToggle: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
  },
  btnRestore: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #6366f1',
    background: '#eef2ff',
    color: '#4338ca',
    cursor: 'pointer',
  },
  btnDanger: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
    cursor: 'pointer',
  },
  btnDisabled: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
