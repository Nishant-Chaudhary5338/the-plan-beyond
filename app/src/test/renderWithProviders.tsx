import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { makeStore, type AppStore } from '@/app/store';
import { TooltipProvider } from '@/components/ui';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  store?: AppStore;
}

/**
 * Render a component with a fresh Redux store, router, and tooltip provider.
 * Returns the store (for assertions) and a pre-bound userEvent instance.
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { route = '/', store = makeStore(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          <TooltipProvider>{children}</TooltipProvider>
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
