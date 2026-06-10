import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Reporting seam — wire this to Sentry/Datadog/etc. in production. Kept as a
   * prop (not a hard dependency) so the design system stays vendor-agnostic.
   */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Optional custom fallback; defaults to the branded recovery panel. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render-time crashes so a broken view never takes down the whole app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Always log; hand off to the reporting seam if one is wired.
    console.error('Render error:', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset);
    return (
      <div role="alert" className="grid min-h-dvh place-items-center p-8">
        <div className="panel max-w-md p-8 text-center">
          <AlertTriangle className="mx-auto size-8 text-warning" />
          <h1 className="mt-4 text-2xl">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The view hit an unexpected error. You can try again — your data is safe.
          </p>
          <Button className="mt-6" onClick={this.reset}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
}
