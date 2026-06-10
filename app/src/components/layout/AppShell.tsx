import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';
import { Spinner } from '@/components/ui';

/** The persistent frame: nav rail + top bar wrap a routed <Outlet/>. */
export function AppShell() {
  return (
    <div className="flex min-h-dvh md:h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col md:h-dvh md:overflow-hidden">
        <TopBar />
        <main
          id="main-content"
          className="scroll-themed flex-1 overflow-y-auto px-5 pb-24 md:px-8 md:pb-8"
        >
          <Suspense
            fallback={
              <div className="grid h-64 place-items-center">
                <Spinner className="size-6 text-muted" label="Loading page" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
