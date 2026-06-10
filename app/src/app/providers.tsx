import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { TooltipProvider, Toaster } from '@/components/ui';

/** App-wide providers: Redux store, error boundary, tooltips, toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </Provider>
    </ErrorBoundary>
  );
}
