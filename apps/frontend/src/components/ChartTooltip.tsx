interface Entry {
  name: string
  value: number
  color?: string
  fill?: string
  payload?: any
}

interface Props {
  active?: boolean
  payload?: Entry[]
  label?: string
  labelFormatter?: (label: string, payload: Entry[]) => string
  valueFormatter?: (value: number, name: string, entry: Entry) => string
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter }: Props) {
  if (!active || !payload || !payload.length) return null

  const displayLabel = labelFormatter
    ? labelFormatter(label ?? '', payload)
    : (label ?? '')

  return (
    <div
      className="card shadow-xl p-3"
      style={{ border: '1px solid var(--border-light)', background: 'var(--bg-card)', backdropFilter: 'blur(8px)' }}
    >
      {displayLabel && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          {displayLabel}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{entry.name}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: entry.color ?? entry.fill ?? 'var(--text-primary)' }}>
            {valueFormatter ? valueFormatter(entry.value, entry.name, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}
