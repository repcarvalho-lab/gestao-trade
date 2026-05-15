import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, isLoading } = useAuthStore()
  const [isRegistering, setIsRegistering] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegistering) {
        await register(nome, email, password)
      } else {
        await login(email, password)
      }
      navigate('/painel')
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } }
      setError(apiError?.response?.data?.error ?? 'Erro ao fazer login. Verifique suas credenciais.')
    }
  }

  return (
    <div className="login-container">
      {/* Esquerda: Arte & Branding */}
      <div className="login-left">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 500 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2rem',
              boxShadow: '0 0 40px rgba(59,130,246,0.4)',
            }}
          >
            <TrendingUp size={36} color="white" />
          </div>
          <h1
            style={{
              fontSize: '3.5rem',
              fontWeight: 800,
              color: 'white',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}
          >
            TraderOS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.25rem', marginTop: '1rem', fontWeight: 300, lineHeight: 1.6 }}>
            Gestão profissional, disciplina matemática e controle emocional para os seus trades.
          </p>
          
          <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', flex: 1, minWidth: 200, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>Projeções</div>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>Cálculo de Juros Compostos</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', flex: 1, minWidth: 200, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em' }}>Riscos</div>
              <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>Controle de Stop Diário</div>
            </div>
          </div>
        </div>
      </div>

      {/* Direita: Formulário */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
          
          {/* Apenas aparece no mobile */}
          <div className="login-mobile-logo" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 0 40px rgba(59,130,246,0.3)',
              }}
            >
              <TrendingUp size={28} color="white" />
            </div>
            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              TraderOS
            </h1>
          </div>

          <div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
                letterSpacing: '-0.01em'
              }}
            >
              {isRegistering ? 'Criar nova conta' : 'Bem-vindo de volta'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              {isRegistering ? 'Preencha seus dados para começar.' : 'Insira suas credenciais para acessar seu painel.'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Nome (Apenas Registro) */}
              {isRegistering && (
                <div>
                  <label className="label" htmlFor="register-nome">
                    Nome
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="register-nome"
                      type="text"
                      className="input"
                      placeholder="Seu nome completo"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      style={{ paddingLeft: '2.75rem', height: '3rem' }}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="label" htmlFor="login-email">
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="login-email"
                    type="email"
                    className="input"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    style={{ paddingLeft: '2.75rem', height: '3rem' }}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="label" htmlFor="login-password">
                  Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    style={{ paddingLeft: '2.75rem', paddingRight: '3rem', height: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem',
                    }}
                    title={showPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Erro */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(244,63,94,0.08)',
                    border: '1px solid rgba(244,63,94,0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: 'var(--accent-loss)',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="login-submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{ width: '100%', height: '3rem', marginTop: '0.5rem', fontSize: '1rem', fontWeight: 600 }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    {isRegistering ? 'Criando conta...' : 'Entrando...'}
                  </>
                ) : (
                  isRegistering ? 'Criar minha conta' : 'Entrar'
                )}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
            </span>{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setError('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isRegistering ? 'Entrar' : 'Criar nova conta'}
            </button>
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              marginTop: '3rem',
            }}
          >
            TraderOS v1.1 · Uso Local
          </p>
        </div>
      </div>

      <style>{`
        .login-container { display: flex; min-height: 100vh; background: var(--bg-base); }
        .login-left { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: center; padding: 4rem 6rem; background: url(/images/login-bg.png) center/cover no-repeat; overflow: hidden; }
        .login-right { flex: 0 0 540px; display: flex; align-items: center; justify-content: center; padding: 3rem; background: var(--bg-surface); box-shadow: -10px 0 40px rgba(0,0,0,0.1); position: relative; zIndex: 2; }
        .login-mobile-logo { display: none; }
        
        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-right { flex: 1; padding: 1.5rem; box-shadow: none; border: none; }
          .login-mobile-logo { display: block; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
