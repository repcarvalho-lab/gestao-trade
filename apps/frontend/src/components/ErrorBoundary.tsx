import React from 'react'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          margin: '2rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(239,68,68,0.4)',
          background: 'rgba(239,68,68,0.08)',
        }}>
          <p style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.5rem' }}>
            Erro ao renderizar a página
          </p>
          <pre style={{
            fontSize: '0.78rem',
            color: '#fca5a5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              background: 'rgba(239,68,68,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
