import type { ErrorInfo } from 'react';

/**
 * The single application-wide crash-reporting seam.
 *
 * Today it logs; in production this is the one place to wire Sentry/Datadog/etc.
 * (e.g. `Sentry.captureException(error, { extra: context })`). Keeping it
 * centralised means the ErrorBoundary and route error elements report through an
 * identical path, and swapping in a provider touches exactly one file.
 */
export function reportError(error: Error, context?: ErrorInfo | Record<string, unknown>): void {
  console.error('[reportError]', error, context);
  // Wire your provider here, e.g.:
  //   if (import.meta.env.PROD) Sentry.captureException(error, { extra: context });
}
