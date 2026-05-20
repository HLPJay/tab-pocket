import { useEffect, useState } from 'react'

type Props = {
  note?: string
  disabled?: boolean
  onSave: (note: string) => Promise<void>
}

export function InlineNoteEditor({ note, disabled, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) {
      setDraft(note ?? '')
    }
  }, [note, editing])

  const openEditor = () => {
    if (disabled) return
    setDraft(note ?? '')
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setDraft(note ?? '')
    setError(null)
    setEditing(false)
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存备注失败')
    } finally {
      setBusy(false)
    }
  }

  if (!editing) {
    return (
      <div style={styles.root}>
        {note && <div style={styles.summary} title={note}>{note}</div>}
        <button onClick={openEditor} disabled={disabled} style={disabled ? styles.btnDisabled : styles.btn}>
          {note ? '编辑备注' : '添加备注'}
        </button>
      </div>
    )
  }

  return (
    <div style={styles.root}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        style={styles.textarea}
        rows={2}
        placeholder="输入备注"
        disabled={busy}
      />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button onClick={save} disabled={busy || disabled} style={busy || disabled ? styles.btnDisabled : styles.btnPrimary}>
          {busy ? '保存中…' : '保存备注'}
        </button>
        <button onClick={cancel} disabled={busy} style={busy ? styles.btnDisabled : styles.btnSecondary}>
          取消
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  summary: {
    fontSize: 11,
    color: '#6b7280',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  textarea: {
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
  actions: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  btn: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
  },
  btnPrimary: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #3b82f6',
    background: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
  },
  btnSecondary: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
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
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
}
