import React from 'react'
import { TrendingUp, TrendingDown, Minus, Zap, ShieldCheck } from 'lucide-react'
import type { NivelDesempenho } from '../../store/analyticsStore'

interface Props {
  nivel: NivelDesempenho
  rentabilidade: number
  capitalInicio: number
  capitalAtual: number
  lucroMes: number
  diasOperados: number
  compact?: boolean // versão menor para o Dashboard
}

const CONFIG: Record<NivelDesempenho, {
  label: string
  cor: string
  bg: string
  border: string
  Icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>
  descricao: string
}> = {
  SEM_DADOS: {
    label: 'Sem operações',
    cor: 'var(--text-muted)',
    bg: 'rgba(100,116,139,0.1)',
    border: 'rgba(100,116,139,0.3)',
    Icon: Minus,
    descricao: 'Nenhum dia operado neste mês ainda.',
  },
  ABAIXO_META: {
    label: 'Abaixo da Meta',
    cor: 'var(--accent-loss)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    Icon: TrendingDown,
    descricao: 'Rentabilidade abaixo do cenário conservador.',
  },
  CONSERVADOR: {
    label: 'Meta Conservadora',
    cor: 'var(--accent-blue)',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    Icon: ShieldCheck,
    descricao: 'No ritmo do cenário conservador.',
  },
  REALISTA: {
    label: 'Meta Realista',
    cor: 'var(--accent-win)',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    Icon: TrendingUp,
    descricao: 'No ritmo do cenário realista.',
  },
  AGRESSIVO: {
    label: 'Meta Agressiva',
    cor: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.3)',
    Icon: Zap,
    descricao: 'Superando a meta agressiva!',
  },
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(v)

const fmtPct = (v: number) =>
  `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`

export default function IndicadorMes({ nivel, rentabilidade, capitalInicio, capitalAtual, lucroMes, diasOperados, compact = false }: Props) {
  const cfg = CONFIG[nivel]
  const { Icon } = cfg

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '10px',
          border: `1px solid ${cfg.border}`,
          background: cfg.bg,
        }}
      >
        <Icon size={18} style={{ color: cfg.cor, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mês Atual
          </p>
          <p style={{ fontSize: '14px', fontWeight: 700, color: cfg.cor, whiteSpace: 'nowrap' }}>
            {cfg.label}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: cfg.cor }}>{fmtPct(rentabilidade)}</p>
          {capitalInicio > 0 && (
            <div style={{ marginTop: 2, marginBottom: 2 }}>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1px' }}>Lucro do Mês</p>
              <p style={{ fontSize: '14px', fontWeight: 800, color: cfg.cor, lineHeight: 1 }}>{fmt(lucroMes)}</p>
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>{diasOperados}d operados</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        borderRadius: '12px',
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '10px',
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} style={{ color: cfg.cor }} />
        </div>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Desempenho — Mês Atual
          </p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: cfg.cor }}>{cfg.label}</p>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <p style={{ fontSize: '22px', fontWeight: 700, color: cfg.cor }}>{fmtPct(rentabilidade)}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{diasOperados} dia(s) operado(s)</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: `1px solid ${cfg.border}` }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2 }}>Capital no início</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(capitalInicio)}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2 }}>Capital atual</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(capitalAtual)}</p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: 2 }}>Lucro do mês</p>
          <p style={{ fontSize: '14px', fontWeight: 600, color: cfg.cor }}>{fmt(lucroMes)}</p>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cfg.descricao}</p>
    </div>
  )
}
