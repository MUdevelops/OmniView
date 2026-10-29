import { Component, type ReactNode } from 'react'
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidUpdate(p: { resetKey: string }) { if (p.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }) }
  render() {
    return this.state.err
      ? <div role="alert" className="m-8 max-w-md rounded border p-4" style={{ borderColor: 'var(--line)' }}>
          <p className="font-bold">This file could not be shown.</p>
          <p style={{ color: 'var(--mute)' }}>{this.state.err.message}. Other files are unaffected.</p></div>
      : this.props.children
  }
}
