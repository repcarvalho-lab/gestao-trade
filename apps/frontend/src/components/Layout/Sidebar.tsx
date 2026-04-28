import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  CalendarDays,
  LineChart,
  ArrowLeftRight,
  Settings,
  LogOut,
  Zap,
  ClipboardList,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCapitalStore } from '../../store/capitalStore'
import { useEffect } from 'react'
import { formatUSD } from '../../lib/format'

const navItems = [
  { to: '/painel',              icon: Zap,            label: 'Painel do Dia' },
  { to: '/relatorios',          icon: ClipboardList,  label: 'Relatórios' },
  { to: '/dashboard',           icon: LayoutDashboard,label: 'Dashboard' },
  { to: '/controle-diario',     icon: CalendarDays,   label: 'Controle Diário' },
  { to: '/planejado-realizado', icon: TrendingUp,     label: 'Planejado x Realizado' },
  { to: '/projecao',            icon: LineChart,      label: 'Projeção Anual' },
  { to: '/movimentos',          icon: ArrowLeftRight, label: 'Depósitos e Saques' },
]

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  sidebarWidth: number;
}

export default function Sidebar({ isCollapsed, toggleCollapse, sidebarWidth }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { capital, fetchCapital } = useCapitalStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCapital()
  }, [fetchCapital])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar" style={{ width: sidebarWidth, transition: 'width 0.3s ease' }}>
      {/* Logo */}
      <div style={{ padding: isCollapsed ? '1.5rem 0 1rem' : '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', flexDirection: isCollapsed ? 'column' : 'row', gap: isCollapsed ? '1rem' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', justifyContent: 'center' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={16} color="white" />
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                TraderOS
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>
                v1.1 · Fase 1
              </div>
            </div>
          )}
        </div>
        <button onClick={toggleCollapse} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer" title={isCollapsed ? "Expandir menu" : "Recolher menu"} style={{ background: 'transparent', border: 'none', padding: '0.2rem' }}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Global Wallet Info */}
      {!isCollapsed && (
        <div style={{ margin: '0.75rem 0.75rem 0', padding: '0.875rem', borderRadius: '0.625rem', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
            <Wallet size={13} style={{ color: 'var(--accent-info)' }} />
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>Banca Global</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
            {capital ? formatUSD(capital.bancaGlobalUSD) : '...'}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>MERCADO</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>
                {capital ? formatUSD(capital.capitalCorretoraUSD) : '...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>RESERVA</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                  {capital ? formatUSD(capital.saldoReservaBRL / capital.cambioConsiderado) : '...'}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '-0.1rem' }}>
                  {capital ? `(R$ ${capital.saldoReservaBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : '...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem 0.75rem', overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={isCollapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: isCollapsed ? '0' : '0.625rem',
              padding: isCollapsed ? '0.75rem 0' : '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '0.125rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={isCollapsed ? 18 : 15} />
            {!isCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: isCollapsed ? '0.75rem 0.5rem' : '0.75rem' }}>
        {user?.role === 'admin' && (
          <NavLink
            to="/configuracoes"
            title={isCollapsed ? "Configurações" : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: isCollapsed ? '0' : '0.625rem',
              padding: isCollapsed ? '0.75rem 0' : '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '0.25rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Settings size={isCollapsed ? 18 : 15} />
            {!isCollapsed && <span>Configurações</span>}
          </NavLink>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? '0' : '0.625rem',
            padding: isCollapsed ? '0.5rem 0' : '0.5rem 0.75rem',
            marginBottom: '0.25rem',
          }}
        >
          <div
            title={isCollapsed ? `${user?.email} (${user?.role})` : undefined}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {user?.email[0].toUpperCase()}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          title={isCollapsed ? "Sair" : undefined}
          style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start', fontSize: '0.8rem', padding: isCollapsed ? '0.75rem 0' : '0.5rem 1.125rem' }}
        >
          <LogOut size={isCollapsed ? 18 : 14} style={{ margin: 0 }} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
