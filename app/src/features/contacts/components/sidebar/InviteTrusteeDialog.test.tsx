import { describe, it, expect, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { InviteTrusteeDialog } from './InviteTrusteeDialog';

function setup() {
  const onOpenChange = vi.fn();
  const utils = renderWithProviders(<InviteTrusteeDialog open onOpenChange={onOpenChange} />, {
    route: '/contacts',
  });
  return { ...utils, onOpenChange };
}

describe('InviteTrusteeDialog', () => {
  it('lists contacts to invite', async () => {
    setup();
    expect(await screen.findByText('Amit Bansal')).toBeInTheDocument();
  });

  it('sends an invite and closes on success', async () => {
    const { user, onOpenChange } = setup();
    const row = (await screen.findByText('Amit Bansal')).closest('li');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Invite' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
