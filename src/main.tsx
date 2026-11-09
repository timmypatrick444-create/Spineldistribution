import {Component, ReactNode, StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  componentDidCatch(error: unknown) {
    console.error('[Storefront Recovery] Caught rendering exception:', error);
    try {
      localStorage.removeItem('spinel_cart');
      sessionStorage.removeItem('spinel_current_invoice_order');
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#eaeded',
            color: '#0F1111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <h1 style={{fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0'}}>
              SPINEL DISTRIBUTION
            </h1>
            <p style={{fontSize: '13px', color: '#475569', margin: '0 0 20px 0', lineHeight: 1.5}}>
              A newer version of the storefront is ready. Click below to refresh your session.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#febd69',
                color: '#131921',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement && !(window as any).__SPINEL_MOUNTED__) {
  (window as any).__SPINEL_MOUNTED__ = true;
  createRoot(rootElement).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
}
