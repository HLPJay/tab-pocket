import type { BrowserTab } from '../../domain/browserTabTypes'
import { getDomainFromUrl } from '../../services/urlFilterService'

type Props = {
  tab: BrowserTab
}

export function CurrentTabCard({ tab }: Props) {
  const domain = getDomainFromUrl(tab.url)

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        {tab.favIconUrl && (
          <img
            src={tab.favIconUrl}
            alt=""
            width={16}
            height={16}
            style={styles.favicon}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <span style={styles.title} title={tab.title}>{tab.title}</span>
        {tab.pinned && <span style={styles.badge}>固定</span>}
        {tab.active && <span style={{ ...styles.badge, ...styles.activeBadge }}>当前</span>}
      </div>
      <div style={styles.domain} title={tab.url}>{domain}</div>
      <div style={styles.actions}>
        <button disabled style={styles.btn}>收纳</button>
        <button disabled style={styles.btn}>收纳并关闭</button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  favicon: {
    flexShrink: 0,
    borderRadius: 2,
  },
  title: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 13,
    fontWeight: 500,
    color: '#111827',
  },
  badge: {
    flexShrink: 0,
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 4,
    background: '#e5e7eb',
    color: '#6b7280',
  },
  activeBadge: {
    background: '#dbeafe',
    color: '#1d4ed8',
  },
  domain: {
    fontSize: 11,
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  btn: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
}
