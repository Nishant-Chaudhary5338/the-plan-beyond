import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PeopleSidebar } from './PeopleSidebar';

describe('PeopleSidebar', () => {
  it('renders the trustees, keyholders, and beyond-circle cards', async () => {
    renderWithProviders(<PeopleSidebar />, { route: '/contacts' });
    // The overview loads async; the cards themselves render immediately via the fallback.
    expect(await screen.findByText('Trustees')).toBeInTheDocument();
    expect(screen.getByText('Keyholders')).toBeInTheDocument();
    expect(screen.getByText('Beyond Circle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /enable beyond circle/i })).toBeInTheDocument();
  });

  it('reflects the empty trustees state from the overview', async () => {
    renderWithProviders(<PeopleSidebar />, { route: '/contacts' });
    expect(await screen.findByText(/no trustees yet/i)).toBeInTheDocument();
  });
});
