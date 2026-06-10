import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { makeStore } from '@/app/store';
import { useContactsStats } from './useContactsStats';

describe('useContactsStats', () => {
  it('returns the fallback overview while loading, then the fetched aggregate', async () => {
    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(Provider, { store, children });
    const { result } = renderHook(() => useContactsStats(), { wrapper });

    // Fallback shape is available synchronously so cards never crash.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.trustees.max_allowed).toBeGreaterThan(0);
    expect(result.current.contacts.total).toBe(0);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // The mock `/people` aggregate reports the seeded contact count.
    expect(result.current.contacts.total).toBeGreaterThan(0);
    expect(result.current.notify_circle.enabled).toBe(true);
  });
});
