import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SegmentFilters } from './SegmentFilters';

describe('SegmentFilters', () => {
  it('toggles a group filter from the Groups menu', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /groups/i }));
    await user.click(await screen.findByRole('button', { name: 'Family' }));
    expect(store.getState().contactsUi.filters.groups).toContain('Family');
  });

  it('sets the Beyond Circle tri-state', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /beyond circle/i }));
    await user.click(await screen.findByRole('button', { name: 'On' }));
    expect(store.getState().contactsUi.filters.beyondCircle).toBe('on');
  });

  it('sets the Emergency tri-state', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /emergency/i }));
    await user.click(await screen.findByRole('button', { name: 'Off' }));
    expect(store.getState().contactsUi.filters.emergency).toBe('off');
  });

  it('selects a relationship', async () => {
    const { user, store } = renderWithProviders(<SegmentFilters />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /relationships/i }));
    await user.click(await screen.findByRole('button', { name: 'Friend' }));
    expect(store.getState().contactsUi.filters.relationship).toBe('Friend');
  });
});
