import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WidgetErrorBoundaryProps {
  widgetName: string
  children: ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ---------------------------------------------------------------------------
// Error Boundary (class component — the only valid way)
// ---------------------------------------------------------------------------

/**
 * Catches rendering errors from plugin widgets and displays a styled
 * error card with retry capability. Isolates plugin crashes from the
 * rest of the dashboard.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Error is already captured in state via getDerivedStateFromError.
    // Logging is intentionally omitted per project rules (no console.log).
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive bg-card p-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3 ring-1 ring-destructive/20">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {this.props.widgetName} failed to load
            </p>
            <p className="text-xs text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 inline-flex h-8 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
