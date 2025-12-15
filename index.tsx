import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 20, background: '#101722', color: 'white', height: '100vh', fontFamily: 'sans-serif'}}>
            <h1>Algo deu errado.</h1>
            <p>Ocorreu um erro crítico que impediu o carregamento do app.</p>
            <pre style={{background: '#333', padding: 10, borderRadius: 5, overflow: 'auto', color: '#ff5555'}}>
                {this.state.error?.toString()}
            </pre>
            <button onClick={() => window.location.reload()} style={{marginTop: 20, padding: '10px 20px', background: '#3484f4', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer'}}>
                Tentar Recarregar
            </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);