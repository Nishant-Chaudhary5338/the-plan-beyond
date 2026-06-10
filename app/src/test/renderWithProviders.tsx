import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { makeStore, type AppStore } from '@/app/store';
import { TooltipProvider } from '@/components/ui';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  store?: AppStore;
}

/**
 * Render a component with a fresh Redux store, router, and tooltip provider.
 * Uses a **data router** (`createMemoryRouter`) to mirror production's
 * `createBrowserRouter`, so data-router hooks like `useBlocker` work in tests.
 * Returns the store (for assertions) and a pre-bound userEvent instance.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', store = makeStore(), ...renderOptions } = options;

  function Tree({ children }: { children: ReactNode }) {
    const router = createMemoryRouter([{ path: '*', element: <TooltipProvider>{children}</TooltipProvider> }], {
      initialEntries: [route],
    });
    return (
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    );
  }

  return {
    store,
    user: userEvent.setup(),
    ...render(<Tree>{ui}</Tree>, renderOptions),
  };
}
