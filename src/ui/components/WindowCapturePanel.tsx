import { useState } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SessionTabInput } from '../../services/sessionCaptureService'

type TabEntry = {
  tab: BrowserTab
  checked: boolean
  note: string
}

type Props = {
  tabs: BrowserTab[]
  onConfirm: (inputs: SessionTabInput[], name: string) => Promise<void>
  onCancel: () => void
}

function defaultSessionName(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return `当前窗口 ${date} ${time}`
}

export function WindowCapturePanel({ tabs, onConfirm, onCancel }: Props) {
  const [sessionName, setSessionName] = useState(defaultSessionName)
  const [entries, setEntries] = useState<TabEntry[]>(
    () => tabs.map((tab) => ({ tab, checked: true, note: '' }))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleCheck = (index: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, checked: !e.checked } : e))
    )
  }

  const updateNote = (index: number, note: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, note } : e))
    )
  }

  const handleConfirm = async () => {
    const selected = entries.filter((e) => e.checked)
    if (selected.length === 0) {
      setError('请至少勾选一个网页')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const inputs: SessionTabInput[] = selected.map((e) => ({ tab: e.tab, note: e.note }))
      await onConfirm(inputs, sessionName.trim() || defaultSessionName())
    } catch (e) {
      setError(e instanceof Error ? e.message : '收纳失败')
      setBusy(false)
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>批量收纳当前窗口</div>
      <div style={styles.field}>
        <div style={styles.fieldLabel}>Session 名称</div>
        <input
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          style={styles.nameInput}
        />
      </div>
      <div style={styles.tabList}>
        {entries.map((entry, i) => (
          <div key={entry.tab.id ?? i} style={styles.tabEntry}>
            <label style={styles.tabRow}>
              <input
                type="checkbox"
                checked={entry.checked}
                onChange={() => toggleCheck(i)}
                style={styles.checkbox}
              />
              <span style={styles.tabTitle} title={entry.tab.title}>{entry.tab.title}</span>
            </label>
            {entry.checked && (
              <input
                type="text"
                value={entry.note}
                onChange={(e) => updateNote(i, e.target.value)}
                placeholder="备注（可选）"
                style={styles.noteInput}
              />
            )}
          </div>
        ))}
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button
          onClick={handleConfirm}
          disabled={busy}
          style={busy ? styles.btnDisabled : styles.btnPrimary}
        >
          {busy ? '收纳中…' : '确认收纳'}
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          style={busy ? styles.btnDisabled : styles.btnCancel}
        >
          取消
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    margin: '0 12px 8px',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  nameInput: {
    fontSize: 12,
    padding: '4px 7px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    fontFamily: 'inherit',
    color: '#111827',
    outline: 'none',
  },
  tabList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tabEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  tabRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
  },
  checkbox: {
    flexShrink: 0,
    cursor: 'pointer',
  },
  tabTitle: {
    fontSize: 12,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  noteInput: {
    fontSize: 11,
    padding: '3px 7px',
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    color: '#374151',
    outline: 'none',
    marginLeft: 22,
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
  btnPrimary: {
    fontSize: 12,
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #6366f1',
    background: '#eef2ff',
    color: '#4338ca',
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnCancel: {
    fontSize: 12,
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#6b7280',
    cursor: 'pointer',
  },
  btnDisabled: {
    fontSize: 12,
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
