import type { SavedSession } from '../../domain/sessionTypes'
import type { SavedTab } from '../../domain/savedTabTypes'
import { SessionCard } from './SessionCard'

type Props = {
  sessions: SavedSession[]
  tabsById: Record<string, SavedTab>
  loading: boolean
  error: string | null
  onOpenTab: (id: string) => Promise<void>
  onDeleteTab: (id: string) => Promise<void>
  onDeleteSession: (id: string) => Promise<void>
}

export function SessionList({
  sessions,
  tabsById,
  loading,
  error,
  onOpenTab,
  onDeleteTab,
  onDeleteSession,
}: Props) {
  if (loading) return <div style={styles.state}>正在读取…</div>
  if (error) return <div style={{ ...styles.state, ...styles.error }}>{error}</div>
  if (sessions.length === 0) return <div style={styles.state}>暂无 Session</div>

  return (
    <div>
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          tabsById={tabsById}
          onOpenTab={onOpenTab}
          onDeleteTab={onDeleteTab}
          onDeleteSession={onDeleteSession}
        />
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
