import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui';
import { reportError } from '@/lib/reportError';

/**
 * Route-level error element. React Router renders this when a route (including a
 * lazy code-split chunk) fails to load or throws while rendering — the common
 * case being a stale chunk after a deploy, which a hard reload fixes.
 */
export function RouteError() {
  const error = useRouteError();

  useEffect(() => {
    reportError(error instanceof Error ? error : new Error(String(error)), { source: 'route' });
  }, [error]);

  const message = error instanceof Error ? error.message : 'This page failed to load.';

  return (
    <div role="alert" className="grid min-h-dvh place-items-center p-8">
      <div className="panel max-w-md p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl">Couldn’t load this page</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="subtle" onClick={() => (window.location.href = '/contacts')}>
            Back to My People
          </Button>
        </div>
      </div>
    </div>
  );
}
