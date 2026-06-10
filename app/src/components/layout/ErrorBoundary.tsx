import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render-time crashes so a broken view never takes down the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Render error:', error, info.componentStack);
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
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
