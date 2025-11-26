import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OptimizationProvider } from './context/OptimizationContext'
import { LogProvider } from './context/LogContext'
import { ThemeProvider } from './context/ThemeContext'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("React Error:", error, errorInfo)
    window.ipcRenderer?.invoke('log-error', { message: error.message, stack: error.stack, info: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', backgroundColor: '#1a1a1a', height: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <LogProvider>
      <ThemeProvider>
        <OptimizationProvider>
          <App />
        </OptimizationProvider>
      </ThemeProvider>
    </LogProvider>
  </ErrorBoundary>,
)
