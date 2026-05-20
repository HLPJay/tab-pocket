export type SectionNavKey = 'current' | 'sessions' | 'inbox' | 'trash'

export type SectionNavItem = {
  key: SectionNavKey
  label: string
  count: number
  tone: SectionNavKey
}

type SectionNavProps = {
  items: SectionNavItem[]
  onSelect: (key: SectionNavKey) => void
}

export function SectionNav({ items, onSelect }: SectionNavProps) {
  return (
    <nav style={styles.nav} aria-label="分组导航">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          style={{ ...styles.item, ...toneStyles[item.tone] }}
        >
          {item.label} · {item.count}
        </button>
      ))}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    flexShrink: 0,
    display: 'flex',
    gap: 8,
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    background: '#fafafa',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
  },
  item: {
    flexShrink: 0,
    fontSize: 11,
    padding: '5px 10px',
    borderRadius: 999,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
  },
}

const toneStyles: Record<SectionNavKey, React.CSSProperties> = {
  current: {
    background: '#dbeafe',
    color: '#1d4ed8',
    borderColor: '#93c5fd',
  },
  sessions: {
    background: '#ede9fe',
    color: '#6d28d9',
    borderColor: '#c4b5fd',
  },
  inbox: {
    background: '#dcfce7',
    color: '#15803d',
    borderColor: '#86efac',
  },
  trash: {
    background: '#fee2e2',
    color: '#b91c1c',
    borderColor: '#fca5a5',
  },
}
