import { useEffect } from 'react';
import { useBlocker, type Blocker } from 'react-router-dom';

/**
 * Guards against losing unsaved edits (UX brief B4): blocks in-app navigation
 * (via React Router's data-router `useBlocker`) and warns on tab close / reload
 * (`beforeunload`) whenever `when` is true. Returns the blocker so the caller can
 * render a confirm prompt.
 */
export function useUnsavedGuard(when: boolean): Blocker {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy assignment required by some browsers to trigger the native prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [when]);

  return blocker;
}
