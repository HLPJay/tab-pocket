import { useState } from 'react'

type Props = {
  title: string
  count?: number
  defaultExpanded?: boolean
  rightActions?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  defaultExpanded = true,
  rightActions,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const label = count !== undefined ? `${title} · ${count} ${countUnit(title)}` : title

  return (
    <section>
      <div style={styles.bar}>
        <span style={styles.label}>{label}</span>
        <div style={styles.barRight}>
          {rightActions}
          <button
            onClick={() => setExpanded((v) => !v)}
            style={styles.toggleBtn}
          >
            {expanded ? '收起' : '展开'}
          </button>
        </div>
      </div>
      {expanded && <div>{children}</div>}
    </section>
  )
}

function countUnit(title: string): string {
  if (title === 'Sessions') return '组'
  return '项'
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px 4px',
    borderTop: '1px solid #f3f4f6',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  barRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  toggleBtn: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid #d1d5db',
    background: '#f9fafb',
    color: '#374151',
    cursor: 'pointer',
  },
}
