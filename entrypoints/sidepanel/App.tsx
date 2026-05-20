import { useState, useEffect, useCallback } from 'react'
import type { BrowserTab } from '../../src/domain/browserTabTypes'
import { getCurrentWindowTabs } from '../../src/chrome/chromeTabsClient'
import { isCollectibleUrl } from '../../src/services/urlFilterService'
import { normalizeUrl } from '../../src/services/urlNormalizeService'
import { useSavedTabs } from '../../src/ui/hooks/useSavedTabs'
import { useSavedSessions } from '../../src/ui/hooks/useSavedSessions'
import { CurrentTabsList } from '../../src/ui/components/CurrentTabsList'
import { InboxList } from '../../src/ui/components/InboxList'
import { TrashList } from '../../src/ui/components/TrashList'
import { SessionList } from '../../src/ui/components/SessionList'

export function App() {
  const [currentTabs, setCurrentTabs] = useState<BrowserTab[]>([])
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState<string | null>(null)

  const [captureNote, setCaptureNote] = useState('')
  const [capturingWindow, setCapturingWindow] = useState(false)
  const [captureWindowError, setCaptureWindowError] = useState<string | null>(null)

  const {
    savedTabs,
    loadingSaved,
    savedError,
    loadSavedTabs,
    captureTab,
    captureAndCloseTab,
    openTab,
    deleteTab,
  } = useSavedTabs()

  const {
    savedSessions,
    loadingSessions,
    sessionError,
    loadSavedSessions,
    captureCurrentWindowAsSession,
    deleteSession,
  } = useSavedSessions()

  const loadCurrentTabs = useCallback(async () => {
    setLoadingCurrent(true)
    setCurrentError(null)
    try {
      const all = await getCurrentWindowTabs()
      setCurrentTabs(all.filter((t) => isCollectibleUrl(t.url)))
    } catch (e) {
      setCurrentError(e instanceof Error ? e.message : '读取标签页失败，请重试。')
    } finally {
      setLoadingCurrent(false)
    }
  }, [])

  const refresh = useCallback(() => {
    loadCurrentTabs()
    loadSavedTabs()
    loadSavedSessions()
  }, [loadCurrentTabs, loadSavedTabs, loadSavedSessions])

  useEffect(() => {
    loadCurrentTabs()
    loadSavedTabs()
    loadSavedSessions()
  }, [loadCurrentTabs, loadSavedTabs, loadSavedSessions])

  // Capture handlers close over captureNote and clear it on success
  const handleCapture = useCallback(
    async (tab: BrowserTab) => {
      await captureTab(tab, captureNote)
      setCaptureNote('')
    },
    [captureTab, captureNote]
  )

  const handleCaptureAndClose = useCallback(
    async (tab: BrowserTab) => {
      await captureAndCloseTab(tab, captureNote)
      await loadCurrentTabs()
      setCaptureNote('')
    },
    [captureAndCloseTab, captureNote, loadCurrentTabs]
  )

  const handleCaptureCurrentWindow = useCallback(async () => {
    setCapturingWindow(true)
    setCaptureWindowError(null)
    try {
      await captureCurrentWindowAsSession(currentTabs, undefined, captureNote)
      await loadSavedTabs()
      setCaptureNote('')
    } catch (e) {
      setCaptureWindowError(e instanceof Error ? e.message : '批量收纳失败')
    } finally {
      setCapturingWindow(false)
    }
  }, [captureCurrentWindowAsSession, currentTabs, captureNote, loadSavedTabs])

  const inboxTabs = savedTabs.filter((t) => t.status === 'inbox')
  const trashTabs = savedTabs.filter((t) => t.status === 'deleted')
  const activeSessions = savedSessions.filter((s) => s.status === 'active')

  const capturedNormalizedUrls = new Set(
    savedTabs.filter((t) => t.status !== 'deleted').map((t) => t.normalizedUrl)
  )

  const tabsById = Object.fromEntries(savedTabs.map((t) => [t.id, t]))

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tab Pocket</h1>
        <button onClick={refresh} style={styles.refreshBtn} title="刷新">↻</button>
      </header>

      {/* 当前打开 — first section, contains note input and batch capture */}
      <Section label="当前打开">
        <div style={styles.captureArea}>
          <textarea
            value={captureNote}
            onChange={(e) => setCaptureNote(e.target.value)}
            placeholder="写点备注，方便之后回顾，例如：Chrome sidePanel 官方文档，后面实现侧边栏时参考"
            style={styles.noteInput}
            rows={2}
          />
          <div style={styles.captureRow}>
            <button
              onClick={handleCaptureCurrentWindow}
              disabled={capturingWindow || loadingCurrent}
              style={capturingWindow ? styles.quickBtnBusy : styles.quickBtn}
            >
              {capturingWindow ? '收纳中…' : '收纳当前窗口'}
            </button>
          </div>
          {captureWindowError && <div style={styles.captureError}>{captureWindowError}</div>}
        </div>
        <CurrentTabsList
          tabs={currentTabs}
          loading={loadingCurrent}
          error={currentError}
          capturedNormalizedUrls={capturedNormalizedUrls}
          onCapture={handleCapture}
          onCaptureAndClose={handleCaptureAndClose}
        />
      </Section>

      {/* Sessions — second section */}
      <Section label="Sessions">
        <SessionList
          sessions={activeSessions}
          tabsById={tabsById}
          loading={loadingSessions}
          error={sessionError}
          onOpenTab={openTab}
          onDeleteTab={deleteTab}
          onDeleteSession={deleteSession}
        />
      </Section>

      {/* Inbox — third section */}
      <Section label="待回看 Inbox">
        <InboxList
          tabs={inboxTabs}
          loading={loadingSaved}
          error={savedError}
          onOpen={openTab}
          onDelete={deleteTab}
        />
      </Section>

      {/* 回收站 — last section */}
      <Section label="回收站">
        <TrashList tabs={trashTabs} />
      </Section>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={styles.sectionLabel}>{label}</div>
      {children}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: '100vh',
    background: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
  },
  refreshBtn: {
    fontSize: 18,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    lineHeight: 1,
    padding: '2px 6px',
    borderRadius: 4,
  },
  sectionLabel: {
    padding: '8px 12px 4px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderTop: '1px solid #f3f4f6',
  },
  captureArea: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    borderBottom: '1px solid #f3f4f6',
  },
  noteInput: {
    width: '100%',
    fontSize: 12,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    resize: 'none',
    fontFamily: 'inherit',
    color: '#374151',
    lineHeight: 1.5,
    boxSizing: 'border-box',
    outline: 'none',
  },
  captureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  quickBtn: {
    fontSize: 12,
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #6366f1',
    background: '#eef2ff',
    color: '#4338ca',
    cursor: 'pointer',
    fontWeight: 500,
  },
  quickBtnBusy: {
    fontSize: 12,
    padding: '5px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
    fontWeight: 500,
  },
  captureError: {
    fontSize: 11,
    color: '#dc2626',
  },
}
