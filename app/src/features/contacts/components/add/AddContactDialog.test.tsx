import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { service } from '@/test/msw/handlers';
import { AddContactDialog } from './AddContactDialog';

function setup() {
  const onOpenChange = vi.fn();
  const utils = renderWithProviders(<AddContactDialog open onOpenChange={onOpenChange} />, {
    route: '/contacts',
  });
  return { ...utils, onOpenChange };
}

describe('AddContactDialog (integration)', () => {
  it('requires a first name', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
  });

  it('rejects an invalid phone number', async () => {
    const { user } = setup();
    await user.type(screen.getByPlaceholderText('First name'), 'Test');
    await user.type(screen.getByPlaceholderText('Phone number'), '123');
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));
    expect(await screen.findByText(/valid phone number/i)).toBeInTheDocument();
  });

  it('creates a contact and closes on success', async () => {
    const { user, onOpenChange } = setup();
    await user.type(screen.getByPlaceholderText('First name'), 'Nisha');
    await user.type(screen.getByPlaceholderText('Last name'), 'Verma');
    await user.type(screen.getByPlaceholderText('Phone number'), '9876512345');
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('surfaces a server validation error for a duplicate number', async () => {
    // Pre-seed the number so the submit trips the server's duplicate guard.
    service.create({ firstName: 'Pre', lastName: '', countryCode: '+91', phone: '9998887766' });
    const { user } = setup();
    await user.type(screen.getByPlaceholderText('First name'), 'Dup');
    await user.type(screen.getByPlaceholderText('Phone number'), '9998887766');
    await user.click(screen.getByRole('button', { name: 'Add Contact' }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});
