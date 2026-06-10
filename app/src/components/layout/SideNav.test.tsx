import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SideNav } from './SideNav';

beforeEach(() => localStorage.clear());

describe('SideNav', () => {
  it('renders the primary nav items', () => {
    renderWithProviders(<SideNav />, { route: '/contacts' });
    expect(screen.getByRole('link', { name: 'My People' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vault' })).toBeInTheDocument();
  });

  it('marks the current route active (background, not just hover)', () => {
    renderWithProviders(<SideNav />, { route: '/contacts' });
    const people = screen.getByRole('link', { name: 'My People' });
    expect(people).toHaveAttribute('aria-current', 'page');
    // NavLink appends the `active` class; the active background hangs off `[&.active]`.
    expect(people).toHaveClass('active');
    expect(people.className).toMatch(/\[&\.active\]:bg-nav-active/);
  });

  it('does not mark a non-current route active', () => {
    renderWithProviders(<SideNav />, { route: '/contacts' });
    expect(screen.getByRole('link', { name: 'Documents' })).not.toHaveClass('active');
  });

  it('starts collapsed and expands on toggle, persisting the choice', async () => {
    const { user } = renderWithProviders(<SideNav />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /expand navigation/i }));
    expect(screen.getByRole('button', { name: /collapse navigation/i })).toBeInTheDocument();
    expect(screen.getByText('The Plan Beyond')).toBeInTheDocument();
    expect(localStorage.getItem('nav:expanded')).toBe('1');
  });

  it('restores the expanded state from localStorage', () => {
    localStorage.setItem('nav:expanded', '1');
    renderWithProviders(<SideNav />, { route: '/contacts' });
    expect(screen.getByRole('button', { name: /collapse navigation/i })).toBeInTheDocument();
  });
});
