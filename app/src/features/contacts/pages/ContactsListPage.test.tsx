import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import ContactsListPage from './ContactsListPage';

describe('ContactsListPage', () => {
  it('renders the header, sidebar, and contacts list', async () => {
    renderWithProviders(<ContactsListPage />, { route: '/contacts' });
    expect(screen.getByRole('heading', { name: 'My People' })).toBeInTheDocument();
    expect(screen.getByText('Trustees')).toBeInTheDocument();
    expect(await screen.findByText('Amit Bansal')).toBeInTheDocument();
  });

  it('opens the Add Contact dialog', async () => {
    const { user } = renderWithProviders(<ContactsListPage />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: /add contact/i }));
    expect(await screen.findByRole('dialog', { name: /add contact/i })).toBeInTheDocument();
  });

  it('opens the Import dialog', async () => {
    const { user } = renderWithProviders(<ContactsListPage />, { route: '/contacts' });
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(await screen.findByRole('dialog', { name: /import contacts/i })).toBeInTheDocument();
  });
});
