import { useState, useEffect, useCallback } from 'react'
import type { BrowserTab } from '../../src/domain/browserTabTypes'
import { getCurrentWindowTabs } from '../../src/chrome/chromeTabsClient'
import { isCollectibleUrl } from '../../src/services/urlFilterService'
import { CurrentTabsList } from '../../src/ui/components/CurrentTabsList'

export function App() {
  const [tabs, setTabs] = useState<BrowserTab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTabs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await getCurrentWindowTabs()
      setTabs(all.filter((t) => isCollectibleUrl(t.url)))
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取标签页失败，请重试。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTabs()
  }, [loadTabs])

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>Tab Pocket</h1>
        <button onClick={loadTabs} style={styles.refreshBtn} title="刷新">
          ↻
        </button>
      </header>
      <section>
        <div style={styles.sectionLabel}>当前打开</div>
        <CurrentTabsList tabs={tabs} loading={loading} error={error} />
      </section>
    </div>
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
  },
}
