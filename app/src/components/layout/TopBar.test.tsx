import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { TopBar } from './TopBar';

describe('TopBar search', () => {
  it('keeps its own value and does NOT mirror into the contacts filter while typing', async () => {
    const { user, store } = renderWithProviders(<TopBar />, { route: '/contacts' });
    const input = screen.getByRole('searchbox', { name: /search people/i });
    await user.type(input, 'ada');
    expect(input).toHaveValue('ada');
    // Regression guard: typing here must not leak into the list's filter.
    expect(store.getState().contactsUi.filters.search).toBe('');
  });

  it('applies the query to the contacts filter on submit (Enter)', async () => {
    const { user, store } = renderWithProviders(<TopBar />, { route: '/contacts' });
    await user.type(screen.getByRole('searchbox', { name: /search people/i }), 'ada{Enter}');
    expect(store.getState().contactsUi.filters.search).toBe('ada');
  });
});
