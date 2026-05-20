import { useState, useEffect, useCallback } from 'react'
import type { BrowserTab } from '../../src/domain/browserTabTypes'
import type { SessionTabInput } from '../../src/services/sessionCaptureService'
import { getCurrentWindowTabs } from '../../src/chrome/chromeTabsClient'
import { isCollectibleUrl } from '../../src/services/urlFilterService'
import type { SavedTab } from '../../src/domain/savedTabTypes'
import { normalizeUrl } from '../../src/services/urlNormalizeService'
import { useSavedTabs } from '../../src/ui/hooks/useSavedTabs'
import { useSavedSessions } from '../../src/ui/hooks/useSavedSessions'
import { CurrentTabsList } from '../../src/ui/components/CurrentTabsList'
import { WindowCapturePanel } from '../../src/ui/components/WindowCapturePanel'
import { InboxList } from '../../src/ui/components/InboxList'
import { TrashList } from '../../src/ui/components/TrashList'
import { SessionList } from '../../src/ui/components/SessionList'

export function App() {
  const [currentTabs, setCurrentTabs] = useState<BrowserTab[]>([])
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [showWindowCapture, setShowWindowCapture] = useState(false)

  const {
    savedTabs,
    loadingSaved,
    savedError,
    loadSavedTabs,
    captureTab,
    captureAndCloseTab,
    openTab,
    deleteTab,
    restoreTab,
    hardDeleteTab,
    clearTrash,
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

  const handleCapture = useCallback(
    async (tab: BrowserTab, note: string) => {
      await captureTab(tab, note)
    },
    [captureTab]
  )

  const handleCaptureAndClose = useCallback(
    async (tab: BrowserTab, note: string) => {
      await captureAndCloseTab(tab, note)
      await loadCurrentTabs()
    },
    [captureAndCloseTab, loadCurrentTabs]
  )

  const handleClearTrash = useCallback(async () => {
    await clearTrash()
    await loadSavedSessions()
  }, [clearTrash, loadSavedSessions])

  const handleWindowCaptureConfirm = useCallback(
    async (inputs: SessionTabInput[], name: string) => {
      await captureCurrentWindowAsSession(inputs, name)
      await loadSavedTabs()
      setShowWindowCapture(false)
    },
    [captureCurrentWindowAsSession, loadSavedTabs]
  )

  // Only show tabs with no sessionId in the ungrouped section
  const ungroupedTabs = savedTabs.filter((t) => t.status === 'inbox' && !t.sessionId)
  const trashTabs = savedTabs.filter((t) => t.status === 'deleted')
  const activeSessions = savedSessions.filter((s) => s.status === 'active')

  const capturedTabsByNormalizedUrl = new Map<string, SavedTab>(
    savedTabs
      .filter((t) => t.status !== 'deleted')
      .map((t) => [t.normalizedUrl, t])
  )

  const tabsById = Object.fromEntries(savedTabs.map((t) => [t.id, t]))

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tab Pocket</h1>
        <button onClick={refresh} style={styles.refreshBtn} title="刷新">↻</button>
      </header>

      {/* 当前打开 */}
      <Section label="当前打开">
        <div style={styles.captureRow}>
          <button
            onClick={() => setShowWindowCapture(true)}
            disabled={loadingCurrent || showWindowCapture}
            style={loadingCurrent || showWindowCapture ? styles.quickBtnBusy : styles.quickBtn}
          >
            收纳当前窗口
          </button>
        </div>
        {showWindowCapture && (
          <WindowCapturePanel
            tabs={currentTabs}
            onConfirm={handleWindowCaptureConfirm}
            onCancel={() => setShowWindowCapture(false)}
          />
        )}
        <CurrentTabsList
          tabs={currentTabs}
          loading={loadingCurrent}
          error={currentError}
          capturedTabsByNormalizedUrl={capturedTabsByNormalizedUrl}
          onCapture={handleCapture}
          onCaptureAndClose={handleCaptureAndClose}
          onCancelCapture={deleteTab}
        />
      </Section>

      {/* Sessions */}
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

      {/* 未分组收纳 */}
      <Section label="未分组收纳">
        <InboxList
          tabs={ungroupedTabs}
          loading={loadingSaved}
          error={savedError}
          onOpen={openTab}
          onDelete={deleteTab}
        />
      </Section>

      {/* 回收站 — self-contained with collapse/expand header */}
      <TrashList
        tabs={trashTabs}
        onRestore={restoreTab}
        onHardDelete={hardDeleteTab}
        onClearTrash={handleClearTrash}
      />
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
  captureRow: {
    padding: '6px 12px 4px',
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
}
