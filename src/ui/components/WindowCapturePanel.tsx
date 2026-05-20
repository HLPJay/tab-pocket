import { useState } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SavedTabReviewStatus } from '../../domain/savedTabTypes'
import type { SessionTabInput } from '../../services/sessionCaptureService'
import { PRESET_TAGS, suggestTagForUrl } from '../../services/tagSuggestionService'

type TabEntry = {
  tab: BrowserTab
  checked: boolean
  note: string
  tag: string
  reviewStatus: SavedTabReviewStatus
}

type Props = {
  tabs: BrowserTab[]
  onConfirm: (inputs: SessionTabInput[], name: string) => Promise<void>
  onConfirmAndClose: (inputs: SessionTabInput[], name: string) => Promise<string | undefined>
  onCancel: () => void
}

const REVIEW_OPTIONS: Array<{ value: SavedTabReviewStatus; label: string }> = [
  { value: 'unprocessed', label: '未处理' },
  { value: 'processing', label: '处理中' },
  { value: 'reviewed', label: '已回顾' },
]

function defaultSessionName(): string {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`
  return `当前窗口 ${date} ${time}`
}

export function WindowCapturePanel({ tabs, onConfirm, onConfirmAndClose, onCancel }: Props) {
  const [sessionName, setSessionName] = useState(defaultSessionName)
  const [entries, setEntries] = useState<TabEntry[]>(
    () => tabs.map((tab) => ({
      tab,
      checked: true,
      note: '',
      tag: suggestTagForUrl(tab.url) ?? '',
      reviewStatus: 'unprocessed' as SavedTabReviewStatus,
    }))
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleCheck = (index: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, checked: !e.checked } : e))
    )
  }

  const updateEntry = (index: number, patch: Partial<TabEntry>) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    )
  }

  const buildInputs = (): SessionTabInput[] => {
    return entries
      .filter((e) => e.checked)
      .map((e) => ({
        tab: e.tab,
        note: e.note || undefined,
        tag: e.tag || undefined,
        reviewStatus: e.reviewStatus,
      }))
  }

  const handleConfirm = async () => {
    const inputs = buildInputs()
    if (inputs.length === 0) {
      setError('请至少勾选一个网页')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onConfirm(inputs, sessionName.trim() || defaultSessionName())
    } catch (e) {
      setError(e instanceof Error ? e.message : '收纳失败')
      setBusy(false)
    }
  }

  const handleConfirmAndClose = async () => {
    const inputs = buildInputs()
    if (inputs.length === 0) {
      setError('请至少勾选一个网页')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const warning = await onConfirmAndClose(inputs, sessionName.trim() || defaultSessionName())
      if (warning) {
        setError(warning)
        setBusy(false)
      }
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
              <div style={styles.entryFields}>
                <div style={styles.entryRow}>
                  <label style={styles.fieldInline}>
                    <span style={styles.fieldInlineLabel}>标签</span>
                    <select
                      value={entry.tag}
                      onChange={(e) => updateEntry(i, { tag: e.target.value })}
                      style={styles.select}
                    >
                      <option value="">无标签</option>
                      {PRESET_TAGS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.fieldInline}>
                    <span style={styles.fieldInlineLabel}>状态</span>
                    <select
                      value={entry.reviewStatus}
                      onChange={(e) => updateEntry(i, { reviewStatus: e.target.value as SavedTabReviewStatus })}
                      style={styles.select}
                    >
                      {REVIEW_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <input
                  type="text"
                  value={entry.note}
                  onChange={(e) => updateEntry(i, { note: e.target.value })}
                  placeholder="备注（可选）"
                  style={styles.noteInput}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actionsRow}>
        <div style={styles.actionsLeft}>
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
        <div style={styles.actionsRight}>
          <button
            onClick={handleConfirmAndClose}
            disabled={busy}
            style={busy ? styles.btnDisabled : styles.btnDanger}
          >
            {busy ? '收纳中…' : '确认收纳并关闭'}
          </button>
        </div>
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
    gap: 6,
  },
  tabEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
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
  entryFields: {
    marginLeft: 22,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  entryRow: {
    display: 'flex',
    gap: 8,
  },
  fieldInline: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  fieldInlineLabel: {
    flexShrink: 0,
  },
  select: {
    fontSize: 11,
    padding: '2px 4px',
    borderRadius: 3,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    fontFamily: 'inherit',
  },
  noteInput: {
    fontSize: 11,
    padding: '3px 7px',
    borderRadius: 3,
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    color: '#374151',
    outline: 'none',
  },
  error: {
    fontSize: 11,
    color: '#dc2626',
  },
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionsLeft: {
    display: 'flex',
    gap: 6,
  },
  actionsRight: {
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
  btnDanger: {
    fontSize: 12,
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #fca5a5',
    background: '#fff5f5',
    color: '#dc2626',
    cursor: 'pointer',
    fontWeight: 500,
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
