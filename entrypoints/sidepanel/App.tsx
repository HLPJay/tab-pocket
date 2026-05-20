import { useState, useEffect, useCallback, useRef } from 'react'
import type { BrowserTab } from '../../src/domain/browserTabTypes'
import type { SessionTabInput } from '../../src/services/sessionCaptureService'
import { activateBrowserTab } from '../../src/services/tabActivateService'
import { closeCurrentBrowserTab } from '../../src/services/tabCloseService'
import { getCurrentWindowTabs } from '../../src/chrome/chromeTabsClient'
import { isCollectibleUrl } from '../../src/services/urlFilterService'
import type { SavedTab, SavedTabReviewStatus } from '../../src/domain/savedTabTypes'
import { useSavedTabs } from '../../src/ui/hooks/useSavedTabs'
import { useSavedSessions } from '../../src/ui/hooks/useSavedSessions'
import { CollapsibleSection } from '../../src/ui/components/CollapsibleSection'
import { CurrentTabsList } from '../../src/ui/components/CurrentTabsList'
import { WindowCapturePanel } from '../../src/ui/components/WindowCapturePanel'
import { InboxList } from '../../src/ui/components/InboxList'
import { TrashList } from '../../src/ui/components/TrashList'
import { SessionList } from '../../src/ui/components/SessionList'
import { SectionNav, type SectionNavKey } from '../../src/ui/components/SectionNav'
import { normalizeStore } from '../../src/services/storeNormalizeService'
import { isUngroupedInboxTab } from '../../src/services/savedTabVisibilityService'
import { selectCapturedTabsByNormalizedUrl } from '../../src/services/savedTabSelectService'

export function App() {
  const [currentTabs, setCurrentTabs] = useState<BrowserTab[]>([])
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [showWindowCapture, setShowWindowCapture] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const currentSectionRef = useRef<HTMLDivElement>(null)
  const sessionsSectionRef = useRef<HTMLDivElement>(null)
  const inboxSectionRef = useRef<HTMLDivElement>(null)
  const trashSectionRef = useRef<HTMLDivElement>(null)

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
    updateTabMeta,
  } = useSavedTabs()

  const {
    savedSessions,
    loadingSessions,
    sessionError,
    loadSavedSessions,
    captureCurrentWindowAsSession,
    captureCurrentWindowAsSessionAndClose,
    openSession,
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

  const refresh = useCallback(async () => {
    if (refreshing) return

    setRefreshing(true)
    try {
      await Promise.all([loadCurrentTabs(), loadSavedTabs(), loadSavedSessions()])
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, loadCurrentTabs, loadSavedTabs, loadSavedSessions])

  useEffect(() => {
    const init = async () => {
      try {
        await normalizeStore()
      } catch {
        // normalize failure must not white-screen the app
      }
      await refresh()
    }
    void init()
  }, [refresh])

  const handleActivate = useCallback(
    async (tab: BrowserTab) => {
      await activateBrowserTab(tab)
      await loadCurrentTabs()
    },
    [loadCurrentTabs]
  )

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

  const handleCloseTab = useCallback(
    async (tab: BrowserTab) => {
      await closeCurrentBrowserTab(tab)
      await loadCurrentTabs()
    },
    [loadCurrentTabs]
  )

  const handleSaveNote = useCallback(
    async (id: string, note: string) => {
      await updateTabMeta(id, { note })
    },
    [updateTabMeta]
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

  const handleWindowCaptureConfirmAndClose = useCallback(
    async (inputs: SessionTabInput[], name: string): Promise<string | undefined> => {
      const result = await captureCurrentWindowAsSessionAndClose(inputs, name)
      await loadSavedTabs()
      await loadCurrentTabs()
      if (!result.closeWarning) {
        setShowWindowCapture(false)
      }
      return result.closeWarning
    },
    [captureCurrentWindowAsSessionAndClose, loadSavedTabs, loadCurrentTabs]
  )

  const handleOpenSession = useCallback(
    async (sessionId: string) => {
      await openSession(sessionId)
    },
    [openSession]
  )

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id)
      await loadSavedTabs()
    },
    [deleteSession, loadSavedTabs]
  )

  const handleUpdateTabMeta = useCallback(
    async (id: string, patch: { note?: string; tag?: string; reviewStatus?: SavedTabReviewStatus }) => {
      await updateTabMeta(id, patch)
    },
    [updateTabMeta]
  )

  const sessionsById = Object.fromEntries(savedSessions.map((s) => [s.id, s]))
  const activeSessions = savedSessions.filter((s) => s.status === 'active')
  const ungroupedTabs = savedTabs.filter((t) => isUngroupedInboxTab(t, sessionsById))
  const trashTabs = savedTabs.filter((t) => t.status === 'deleted')
  const capturedTabsByNormalizedUrl = selectCapturedTabsByNormalizedUrl(savedTabs, sessionsById)
  const tabsById = Object.fromEntries(savedTabs.map((t) => [t.id, t]))

  const sectionRefs: Record<SectionNavKey, React.RefObject<HTMLDivElement>> = {
    current: currentSectionRef,
    sessions: sessionsSectionRef,
    inbox: inboxSectionRef,
    trash: trashSectionRef,
  }

  const handleSelectSection = useCallback((key: SectionNavKey) => {
    sectionRefs[key].current?.scrollIntoView({
      block: 'start',
      behavior: 'smooth',
    })
  }, [])

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tab Pocket</h1>
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          style={refreshing ? styles.refreshBtnBusy : styles.refreshBtn}
          title={refreshing ? '刷新中…' : '刷新'}
        >
          {refreshing ? '刷新中…' : '↻'}
        </button>
      </header>

      <SectionNav
        items={[
          { key: 'current', label: '当前打开', count: currentTabs.length, tone: 'current' },
          { key: 'sessions', label: 'Sessions', count: activeSessions.length, tone: 'sessions' },
          { key: 'inbox', label: '未分组', count: ungroupedTabs.length, tone: 'inbox' },
          { key: 'trash', label: '回收站', count: trashTabs.length, tone: 'trash' },
        ]}
        onSelect={handleSelectSection}
      />

      <main style={styles.main}>
        <div ref={currentSectionRef}>
          <CollapsibleSection title="当前打开" count={currentTabs.length} defaultExpanded tone="current">
            <div style={styles.captureRow}>
              <button
                onClick={() => setShowWindowCapture((v) => !v)}
                disabled={loadingCurrent}
                style={loadingCurrent ? styles.quickBtnBusy : styles.quickBtn}
              >
                {showWindowCapture ? '收起批量收纳' : '收纳当前窗口'}
              </button>
            </div>
            {showWindowCapture && (
              <WindowCapturePanel
                tabs={currentTabs}
                onConfirm={handleWindowCaptureConfirm}
                onConfirmAndClose={handleWindowCaptureConfirmAndClose}
                onCancel={() => setShowWindowCapture(false)}
              />
            )}
            <CurrentTabsList
              tabs={currentTabs}
              loading={loadingCurrent}
              error={currentError}
              capturedTabsByNormalizedUrl={capturedTabsByNormalizedUrl}
              onActivate={handleActivate}
              onCapture={handleCapture}
              onCaptureAndClose={handleCaptureAndClose}
              onCancelCapture={deleteTab}
              onCloseTab={handleCloseTab}
              onSaveNote={handleSaveNote}
            />
          </CollapsibleSection>
        </div>

        <div ref={sessionsSectionRef}>
          <CollapsibleSection title="Sessions" count={activeSessions.length} defaultExpanded={false} tone="sessions">
            <SessionList
              sessions={activeSessions}
              tabsById={tabsById}
              loading={loadingSessions}
              error={sessionError}
              onOpenTab={openTab}
              onDeleteTab={deleteTab}
              onDeleteSession={handleDeleteSession}
              onOpenAll={handleOpenSession}
            />
          </CollapsibleSection>
        </div>

        <div ref={inboxSectionRef}>
          <CollapsibleSection title="未分组" count={ungroupedTabs.length} defaultExpanded={false} tone="inbox">
            <InboxList
              tabs={ungroupedTabs}
              loading={loadingSaved}
              error={savedError}
              onOpen={openTab}
              onDelete={deleteTab}
              onUpdateMeta={handleUpdateTabMeta}
            />
          </CollapsibleSection>
        </div>

        <div ref={trashSectionRef}>
          <TrashList
            tabs={trashTabs}
            onRestore={restoreTab}
            onHardDelete={hardDeleteTab}
            onClearTrash={handleClearTrash}
          />
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fff',
  },
  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    background: '#fff',
    zIndex: 20,
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
  refreshBtnBusy: {
    fontSize: 14,
    background: 'none',
    border: 'none',
    cursor: 'not-allowed',
    color: '#9ca3af',
    lineHeight: 1,
    padding: '2px 6px',
    borderRadius: 4,
  },
  main: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
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
