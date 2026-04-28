import { useState } from 'react'
import { CheckCircle, AlertOctagon, Target, Crosshair, TrendingUp, BarChart2, Clock } from 'lucide-react'
import { Preset, computeFiltro, PRESETS } from './components/RelatoriosShared'

// Componentes extraídos
import ScoreCard from './components/ScoreCard'
import AbaDisciplina from './components/AbaDisciplina'
import AbaPerformance from './components/AbaPerformance'
import AbaEstrategias from './components/AbaEstrategias'
import AbaErros from './components/AbaErros'
import AbaEficienciaMeta from './components/AbaEficienciaMeta'
import AbaAtivos from './components/AbaAtivos'
import AbaDiaSemana from './components/AbaDiaSemana'

const TABS = [
  { key: 'disciplina',   label: 'Disciplina',               icon: CheckCircle },
  { key: 'meta',         label: 'Eficiência de Meta',       icon: Target },
  { key: 'erros',        label: 'Erros & Impacto',          icon: AlertOctagon },
  { key: 'dias-semana',  label: 'Dias da Semana',           icon: Clock },
  { key: 'ativos',       label: 'Ativos',                   icon: BarChart2 },
  { key: 'estrategias',  label: 'Origem da Entrada',        icon: Crosshair },
  { key: 'performance',  label: 'Performance por Período',  icon: TrendingUp },
]

export default function Relatorios() {
  const [aba, setAba]       = useState('disciplina')
  const [preset, setPreset] = useState<Preset>('all')
  const filtro = computeFiltro(preset)

  return (
    <div className="animate-slide-in flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-text-primary m-0">Relatórios</h1>
          <p className="text-text-muted text-[0.85rem] mt-1">
            Análise detalhada de disciplina operacional e métricas de performance.
          </p>
        </div>

        {/* Filtro de período */}
        <div className="flex gap-1.5 items-center">
          {PRESETS.map(p => {
            const ativo = preset === p.value
            return (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`
                  px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all
                  border ${ativo ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border bg-transparent text-text-muted hover:border-border-light hover:bg-bg-hover'}
                `}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Score Card */}
      <ScoreCard filtro={filtro} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, label, icon: Icon }) => {
          const ativo = aba === key
          return (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-[0.875rem] font-bold cursor-pointer border-none bg-transparent whitespace-nowrap
                border-b-[2px] transition-colors -mb-[1px]
                ${ativo ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}
              `}
            >
              <Icon size={15} />{label}
            </button>
          )
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="min-h-[400px]">
        {aba === 'disciplina'  && <AbaDisciplina filtro={filtro} />}
        {aba === 'performance' && <AbaPerformance />}
        {aba === 'estrategias' && <AbaEstrategias filtro={filtro} />}
        {aba === 'erros'       && <AbaErros filtro={filtro} />}
        {aba === 'meta'        && <AbaEficienciaMeta filtro={filtro} />}
        {aba === 'ativos'      && <AbaAtivos filtro={filtro} />}
        {aba === 'dias-semana' && <AbaDiaSemana filtro={filtro} />}
      </div>
      
    </div>
  )
}
