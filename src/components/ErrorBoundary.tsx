import { Component, type ReactNode } from 'react';

interface State { error: Error | null; }
interface Props { children: ReactNode; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[FOROL] React Error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            maxWidth: 600,
            margin: '60px auto',
            fontFamily: 'Inter, sans-serif',
            color: '#1A1A1A',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#D32F2F',
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}
          >
            FOROL
          </div>
          <div style={{ fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Etwas ist schiefgegangen
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            In der Anwendung ist ein unerwarteter Fehler aufgetreten. Diese Seite wurde
            neu gestartet — beim Aktualisieren sollte alles wieder funktionieren.
          </p>
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#F5F5F5',
              border: '1px solid #E0E0E0',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#666',
              maxHeight: 200,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error.message}
            {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              background: '#D32F2F',
              color: 'white',
              border: 'none',
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
