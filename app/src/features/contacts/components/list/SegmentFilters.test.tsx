import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SegmentFilters } from './SegmentFilters';

describe('SegmentFilters', () => {
  it('toggles a group filter from the Groups menu', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /groups/i }));
    const family = await screen.findByRole('menuitemcheckbox', { name: 'Family' });
    expect(family).toHaveAttribute('aria-checked', 'false');
    await user.click(family);
    expect(store.getState().contactsUi.filters.groups).toContain('Family');
  });

  it('sets the Beyond Circle tri-state', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /beyond circle/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'On' }));
    expect(store.getState().contactsUi.filters.beyondCircle).toBe('on');
  });

  it('sets the Emergency tri-state', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /emergency/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Off' }));
    expect(store.getState().contactsUi.filters.emergency).toBe('off');
  });

  it('selects a relationship and exposes the checked state to AT', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /relationships/i }));
    const friend = await screen.findByRole('menuitemradio', { name: 'Friend' });
    await user.click(friend);
    expect(store.getState().contactsUi.filters.relationship).toBe('Friend');
  });

  it('exposes the filter options as an accessible menu', async () => {
    const { user } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /relationships/i }));
    expect(await screen.findByRole('menu', { name: 'Filter by relationship' })).toBeInTheDocument();
  });
});
