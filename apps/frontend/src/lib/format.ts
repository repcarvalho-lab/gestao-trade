// ── Monetário ────────────────────────────────────────────────
export function formatUSD(value: number | null | undefined): string {
  if (value == null) return 'US$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

// ── Percentual ───────────────────────────────────────────────
export function formatPct(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

// ── Datas ────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  // Use UTC to prevent midnight UTC from shifting to the previous day in local TZs
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateFull(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// ── Cor de valor ──────────────────────────────────────────────
export function valueClass(value: number | null | undefined): string {
  if (value == null) return 'value-neutral'
  if (value > 0) return 'value-positive'
  if (value < 0) return 'value-negative'
  return 'value-neutral'
}

// ── Cor de status ─────────────────────────────────────────────
export function statusClass(status: string, isClosed?: boolean): string {
  switch (status) {
    case 'META_IDEAL': return 'status-meta-ideal'
    case 'META_MAXIMA': return 'status-meta-maxima'
    case 'ATENCAO': return 'status-atencao'
    case 'STOP': return 'status-stop'
    case 'META_NAO_ATINGIDA': return 'status-meta-nao-atingida'
    default: return isClosed ? 'status-fechado' : 'status-operando'
  }
}

export function statusLabel(status: string, isClosed?: boolean): string {
  switch (status) {
    case 'META_IDEAL': return '✓ Meta Ideal'
    case 'META_MAXIMA': return '✓ Meta Máxima'
    case 'ATENCAO': return '⚠ Atenção'
    case 'STOP': return '✕ STOP'
    case 'META_NAO_ATINGIDA': return '○ Meta Não Atingida'
    default: return isClosed ? '■ Finalizado' : '● Operando'
  }
}
