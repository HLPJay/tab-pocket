import { useState, useEffect, useCallback } from 'react'
import type { BrowserTab } from '../../src/domain/browserTabTypes'
import { getCurrentWindowTabs } from '../../src/chrome/chromeTabsClient'
import { isCollectibleUrl } from '../../src/services/urlFilterService'
import { normalizeUrl } from '../../src/services/urlNormalizeService'
import { useSavedTabs } from '../../src/ui/hooks/useSavedTabs'
import { CurrentTabsList } from '../../src/ui/components/CurrentTabsList'
import { InboxList } from '../../src/ui/components/InboxList'
import { TrashList } from '../../src/ui/components/TrashList'

export function App() {
  const [currentTabs, setCurrentTabs] = useState<BrowserTab[]>([])
  const [loadingCurrent, setLoadingCurrent] = useState(true)
  const [currentError, setCurrentError] = useState<string | null>(null)

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
  }, [loadCurrentTabs, loadSavedTabs])

  useEffect(() => {
    loadCurrentTabs()
    loadSavedTabs()
  }, [loadCurrentTabs, loadSavedTabs])

  // After capture-and-close succeeds the tab is gone — refresh current list too
  const handleCaptureAndClose = useCallback(
    async (tab: BrowserTab) => {
      await captureAndCloseTab(tab)
      await loadCurrentTabs()
    },
    [captureAndCloseTab, loadCurrentTabs]
  )

  const inboxTabs = savedTabs.filter((t) => t.status === 'inbox')
  const trashTabs = savedTabs.filter((t) => t.status === 'deleted')

  const capturedNormalizedUrls = new Set(
    savedTabs.filter((t) => t.status !== 'deleted').map((t) => t.normalizedUrl)
  )

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tab Pocket</h1>
        <button onClick={refresh} style={styles.refreshBtn} title="刷新">↻</button>
      </header>

      <Section label="当前打开">
        <CurrentTabsList
          tabs={currentTabs}
          loading={loadingCurrent}
          error={currentError}
          capturedNormalizedUrls={capturedNormalizedUrls}
          onCapture={captureTab}
          onCaptureAndClose={handleCaptureAndClose}
        />
      </Section>

      <Section label="待回看 Inbox">
        <InboxList
          tabs={inboxTabs}
          loading={loadingSaved}
          error={savedError}
          onOpen={openTab}
          onDelete={deleteTab}
        />
      </Section>

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
}
