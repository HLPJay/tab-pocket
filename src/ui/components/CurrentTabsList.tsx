import { useState } from 'react'
import type { BrowserTab } from '../../domain/browserTabTypes'
import type { SavedTab } from '../../domain/savedTabTypes'
import { normalizeUrl } from '../../services/urlNormalizeService'
import { CurrentTabCard } from './CurrentTabCard'

type Props = {
  tabs: BrowserTab[]
  loading: boolean
  error: string | null
  capturedTabsByNormalizedUrl: Map<string, SavedTab>
  onActivate: (tab: BrowserTab) => Promise<void>
  onCapture: (tab: BrowserTab, note: string) => Promise<void>
  onCaptureAndClose: (tab: BrowserTab, note: string) => Promise<void>
  onCancelCapture: (id: string) => Promise<void>
  onCloseTab: (tab: BrowserTab) => Promise<void>
  onSaveNote: (id: string, note: string) => Promise<void>
}

function getTabKey(tab: BrowserTab): string {
  return `${tab.windowId}:${tab.id}:${tab.url}`
}

export function CurrentTabsList({
  tabs,
  loading,
  error,
  capturedTabsByNormalizedUrl,
  onActivate,
  onCapture,
  onCaptureAndClose,
  onCancelCapture,
  onCloseTab,
  onSaveNote,
}: Props) {
  const [expandedNoteKey, setExpandedNoteKey] = useState<string | null>(null)

  if (loading) return <div style={styles.state}>正在读取标签页…</div>
  if (error) return <div style={{ ...styles.state, ...styles.error }}>{error}</div>
  if (tabs.length === 0) return <div style={styles.state}>当前没有可收纳网页</div>

  return (
    <div>
      {tabs.map((tab) => {
        const key = getTabKey(tab)
        const capturedTab = capturedTabsByNormalizedUrl.get(normalizeUrl(tab.url))
        return (
          <CurrentTabCard
            key={key}
            tab={tab}
            capturedTab={capturedTab}
            noteExpanded={expandedNoteKey === key}
            onToggleNote={() =>
              setExpandedNoteKey((prev) => (prev === key ? null : key))
            }
            onCollapseNote={() =>
              setExpandedNoteKey((prev) => (prev === key ? null : prev))
            }
            onActivate={onActivate}
            onCapture={onCapture}
            onCaptureAndClose={onCaptureAndClose}
            onCancelCapture={onCancelCapture}
            onCloseTab={onCloseTab}
            onSaveNote={onSaveNote}
          />
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  state: {
    padding: '16px',
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
  error: { color: '#dc2626' },
}
