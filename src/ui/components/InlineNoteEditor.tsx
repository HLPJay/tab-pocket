import { useEffect, useState } from 'react'

type Props = {
  note?: string
  disabled?: boolean
  onSave: (note: string) => Promise<void>
  compact?: boolean
  buttonLabel?: string
  hideSummary?: boolean
}

export function InlineNoteEditor({
  note,
  disabled,
  onSave,
  compact = false,
  buttonLabel,
  hideSummary = false,
}: Props) {
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
    if (busy) return
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void save()
    }
  }

  const collapsedButtonLabel = buttonLabel ?? (note ? '编辑备注' : '添加备注')

  if (!editing) {
    return (
      <div style={compact ? styles.compactRoot : styles.root}>
        {note && !hideSummary && (
          <div style={compact ? styles.compactSummary : styles.summary} title={note}>
            {note}
          </div>
        )}
        <button
          onClick={openEditor}
          disabled={disabled}
          style={disabled ? (compact ? styles.compactBtnDisabled : styles.btnDisabled) : (compact ? styles.compactBtn : styles.btn)}
        >
          {collapsedButtonLabel}
        </button>
      </div>
    )
  }

  return (
    <div style={compact ? styles.compactEditingRoot : styles.root}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        style={compact ? styles.compactTextarea : styles.textarea}
        rows={2}
        placeholder="输入备注"
        disabled={busy}
      />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button
          onClick={save}
          disabled={busy || disabled}
          style={busy || disabled ? (compact ? styles.compactBtnDisabled : styles.btnDisabled) : (compact ? styles.compactBtnPrimary : styles.btnPrimary)}
        >
          {busy ? '保存中…' : '保存备注'}
        </button>
        <button
          onClick={cancel}
          disabled={busy}
          style={busy ? (compact ? styles.compactBtnDisabled : styles.btnDisabled) : (compact ? styles.compactBtnSecondary : styles.btnSecondary)}
        >
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
  compactRoot: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    maxWidth: '100%',
  },
  compactEditingRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    maxWidth: 220,
  },
  summary: {
    fontSize: 11,
    color: '#6b7280',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  compactSummary: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.35,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  compactTextarea: {
    width: '100%',
    fontSize: 11,
    padding: '4px 6px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    resize: 'vertical',
    fontFamily: 'inherit',
    color: '#374151',
    lineHeight: 1.4,
    boxSizing: 'border-box',
    outline: 'none',
    background: '#fff',
    minHeight: 52,
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
  compactBtn: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
    width: 'auto',
    alignSelf: 'flex-start',
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
  compactBtnPrimary: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid #3b82f6',
    background: '#eff6ff',
    color: '#1d4ed8',
    cursor: 'pointer',
    width: 'auto',
    alignSelf: 'flex-start',
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
  compactBtnSecondary: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    width: 'auto',
    alignSelf: 'flex-start',
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
  compactBtnDisabled: {
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
    width: 'auto',
    alignSelf: 'flex-start',
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
}
