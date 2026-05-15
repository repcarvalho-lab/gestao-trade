import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Save, Lock, Bell, Moon, Sun, ShieldCheck, Eye, EyeOff } from 'lucide-react'

export default function Perfil() {
  const { user, updateProfile } = useAuthStore()

  const [nome, setNome] = useState(user?.nome || user?.email.split('@')[0] || '')
  const [email, setEmail] = useState(user?.email || '')

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showNovaSenha, setShowNovaSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile(nome, email)
      alert('Perfil atualizado com sucesso!')
    } catch (err) {
      alert('Erro ao atualizar perfil.')
    }
  }

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) {
      alert('As senhas não coincidem.')
      return
    }
    alert('Senha atualizada com sucesso!')
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmarSenha('')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text-primary)' }}>
        Meu Perfil
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
        
        {/* COLUNA ESQUERDA */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Identity Card (Glassmorphism) */}
          <div
            style={{
              background: 'rgba(30, 41, 64, 0.4)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-light)',
              borderRadius: '1rem',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              flex: 1,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'white',
                marginBottom: '1rem',
                boxShadow: '0 0 0 4px var(--bg-base), 0 0 0 6px var(--accent-blue)',
              }}
            >
              {email[0]?.toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>{nome}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{email}</p>
            <div style={{ marginTop: '0.75rem' }}>
              <span className="badge badge-blue">Plano Premium</span>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Informações Pessoais */}
          <section className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Informações Pessoais
          </h3>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  className="input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Salvar Alterações
              </button>
            </div>
          </form>
        </section>

        {/* === LINHA 2 === */}
      {/* Segurança */}
        <section className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="var(--accent-win)" /> Segurança
          </h3>
          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">Senha Atual</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSenhaAtual ? 'text' : 'password'}
                  className="input"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
                  title={showSenhaAtual ? "Ocultar senha" : "Ver senha"}
                >
                  {showSenhaAtual ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNovaSenha ? 'text' : 'password'}
                    className="input"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNovaSenha(!showNovaSenha)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
                    title={showNovaSenha ? "Ocultar senha" : "Ver senha"}
                  >
                    {showNovaSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirmar Nova Senha</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmarSenha ? 'text' : 'password'}
                    className="input"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
                    title={showConfirmarSenha ? "Ocultar senha" : "Ver senha"}
                  >
                    {showConfirmarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-win), #059669)',
                  border: 'none',
                }}
              >
                <Lock size={16} /> Atualizar Senha
              </button>
            </div>
          </form>
        </section>
        </div>
      </div>
    </div>
  )
}
