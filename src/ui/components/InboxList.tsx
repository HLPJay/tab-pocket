import type { SavedTab } from '../../domain/savedTabTypes'
import { SavedTabCard } from './SavedTabCard'

type Props = {
  tabs: SavedTab[]
  loading: boolean
  error: string | null
  onOpen: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function InboxList({ tabs, loading, error, onOpen, onDelete }: Props) {
  if (loading) return <div style={styles.state}>正在读取…</div>
  if (error) return <div style={{ ...styles.state, ...styles.error }}>{error}</div>
  if (tabs.length === 0) return <div style={styles.state}>暂无待回看网页</div>

  return (
    <div>
      {tabs.map((tab) => (
        <SavedTabCard key={tab.id} tab={tab} onOpen={onOpen} onDelete={onDelete} />
      ))}
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
