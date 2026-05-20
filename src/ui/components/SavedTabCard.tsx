import { useState } from 'react'
import type { SavedTab } from '../../domain/savedTabTypes'

type Props = {
  tab: SavedTab
  onOpen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function SavedTabCard({ tab, onOpen, onDelete }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div style={styles.card}>
      <div style={styles.title} title={tab.title}>{tab.title}</div>
      <div style={styles.meta}>
        <span style={styles.domain}>{tab.domain}</span>
        <span style={styles.dot}>·</span>
        <span style={styles.time}>{new Date(tab.capturedAt).toLocaleString()}</span>
        {tab.openCount > 0 && (
          <>
            <span style={styles.dot}>·</span>
            <span style={styles.openCount}>已打开 {tab.openCount} 次</span>
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
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#9ca3af',
  },
  domain: { color: '#6b7280' },
  dot: {},
  time: {},
  openCount: {},
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
