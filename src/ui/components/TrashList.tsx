import type { SavedTab } from '../../domain/savedTabTypes'

type Props = {
  tabs: SavedTab[]
}

export function TrashList({ tabs }: Props) {
  if (tabs.length === 0) {
    return <div style={styles.state}>回收站为空</div>
  }

  return (
    <div>
      {tabs.map((tab) => (
        <div key={tab.id} style={styles.card}>
          <div style={styles.title} title={tab.title}>{tab.title}</div>
          <div style={styles.meta}>
            <span>{tab.domain}</span>
            {tab.deletedAt && (
              <>
                <span style={styles.dot}>·</span>
                <span>已删除于 {new Date(tab.deletedAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
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
  card: {
    padding: '8px 12px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    opacity: 0.6,
  },
  title: {
    fontSize: 12,
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: {
    display: 'flex',
    gap: 4,
    fontSize: 11,
    color: '#9ca3af',
  },
  dot: {},
}
