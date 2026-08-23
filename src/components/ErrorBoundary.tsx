import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; label?: string }
type State = { err: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(error: Error): State {
    return { err: error.message || String(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[fx-lab demo]', this.props.label, error, info.componentStack)
  }

  render() {
    if (this.state.err) {
      return (
        <div className="fail-card">
          <strong>这个组件在本机没跑起来</strong>
          <span>{this.state.err}</span>
        </div>
      )
    }
    return this.props.children
  }
}
