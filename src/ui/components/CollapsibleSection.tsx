import { useState } from 'react'

type Props = {
  title: string
  count?: number
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  tone?: 'current' | 'sessions' | 'inbox' | 'trash'
  rightActions?: React.ReactNode
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  count,
  defaultExpanded = true,
  expanded,
  onExpandedChange,
  tone = 'current',
  rightActions,
  children,
}: Props) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isControlled = expanded !== undefined
  const actualExpanded = isControlled ? expanded : internalExpanded
  const label = count !== undefined ? `${title} 路 ${count} ${countUnit(title)}` : title

  const setActualExpanded = (next: boolean) => {
    if (!isControlled) {
      setInternalExpanded(next)
    }
    onExpandedChange?.(next)
  }

  const toggle = () => setActualExpanded(!actualExpanded)

  return (
    <section>
      <div
        style={{ ...styles.bar, ...toneStyles[tone] }}
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        <span style={styles.label}>{label}</span>
        <div
          style={styles.barRight}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {rightActions}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
            style={styles.toggleBtn}
          >
            {actualExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>
      {actualExpanded && <div>{children}</div>}
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
    padding: '8px 12px',
    borderTop: '1px solid #e5e7eb',
    borderLeft: '4px solid transparent',
    background: '#f8fafc',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#334155',
  },
  barRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'default',
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

const toneStyles: Record<NonNullable<Props['tone']>, React.CSSProperties> = {
  current: { background: '#eff6ff', borderLeftColor: '#2563eb' },
  sessions: { background: '#f5f3ff', borderLeftColor: '#7c3aed' },
  inbox: { background: '#ecfdf5', borderLeftColor: '#059669' },
  trash: { background: '#fef2f2', borderLeftColor: '#dc2626' },
}
