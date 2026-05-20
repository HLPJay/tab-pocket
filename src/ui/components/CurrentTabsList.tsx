import type { BrowserTab } from '../../domain/browserTabTypes'
import { CurrentTabCard } from './CurrentTabCard'

type Props = {
  tabs: BrowserTab[]
  loading: boolean
  error: string | null
}

export function CurrentTabsList({ tabs, loading, error }: Props) {
  if (loading) {
    return <div style={styles.state}>正在读取标签页…</div>
  }

  if (error) {
    return <div style={{ ...styles.state, ...styles.error }}>{error}</div>
  }

  if (tabs.length === 0) {
    return <div style={styles.state}>当前没有可收纳网页</div>
  }

  return (
    <div>
      {tabs.map((tab) => (
        <CurrentTabCard key={tab.id} tab={tab} />
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  state: {
    padding: '24px 16px',
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
  },
  error: {
    color: '#dc2626',
  },
}
