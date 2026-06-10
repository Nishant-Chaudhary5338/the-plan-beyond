import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { mswServer } from '@/test/msw/server';
import ContactDetailPage from './ContactDetailPage';

function setup(id = 'seed-001') {
  return renderWithProviders(
    <Routes>
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/contacts" element={<div>My People list</div>} />
    </Routes>,
    { route: `/contacts/${id}` }
  );
}

describe('ContactDetailPage (integration)', () => {
  it('loads the contact into the form', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'Amit Bansal' })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Amit');
    expect(screen.getByText('Identifier')).toBeInTheDocument();
  });

  it('reveals the unsaved bar after an edit and hides it after save', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });
    expect(screen.queryByRole('region', { name: /unsaved changes/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/middle name/i), 'Kumar');
    expect(screen.getByRole('region', { name: /unsaved changes/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /unsaved changes/i })).not.toBeInTheDocument()
    );
  });

  it('persists Date of Birth across the post-save refetch (BUG-1)', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });
    const dob = screen.getByLabelText(/date of birth/i);
    await user.clear(dob);
    await user.type(dob, '1990-05-20');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    // After the invalidation refetch lands, the value must still be there.
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /unsaved changes/i })).not.toBeInTheDocument()
    );
    expect(screen.getByLabelText(/date of birth/i)).toHaveValue('1990-05-20');
  });

  it('rolls back the optimistic edit and keeps the unsaved bar when the save fails', async () => {
    // Force the PUT to fail so the optimistic update must roll back.
    mswServer.use(
      http.put('/api/contacts/:id', () =>
        HttpResponse.json({ message: 'Server exploded' }, { status: 500 })
      )
    );
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });

    await user.type(screen.getByLabelText(/middle name/i), 'Kumar');
    expect(screen.getByLabelText(/middle name/i)).toHaveValue('Kumar');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // The unsaved bar must remain (save failed) and the edit must persist locally
    // for the user to retry — the optimistic cache patch is rolled back underneath.
    await waitFor(() =>
      expect(screen.getByRole('region', { name: /unsaved changes/i })).toBeInTheDocument()
    );
    expect(screen.getByLabelText(/middle name/i)).toHaveValue('Kumar');
  });

  it('discards edits and reverts the field', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });
    const middle = screen.getByLabelText(/middle name/i);
    await user.type(middle, 'Temp');
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(middle).toHaveValue('');
  });

  it('toggling Beyond Circle marks the form dirty', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });
    await user.click(screen.getByRole('switch', { name: 'Emergency Contact' }));
    expect(screen.getByRole('region', { name: /unsaved changes/i })).toBeInTheDocument();
  });

  it('edits every address, professional, personal and notes field', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });

    const edits: ReadonlyArray<readonly [string | RegExp, string]> = [
      ['Flat / Building', 'A1'],
      ['Street / Locality', 'Main St'],
      ['City', 'X'],
      ['State', 'MH'],
      ['Postal code', '400001'],
      ['Country', 'India'],
      ['Nickname', 'Am'],
      ['Company', 'Acme'],
      ['Job title', 'Eng'],
      ['Website', 'example.com'],
      [/^first name/i, 'Z'],
      ['Last name', 'Q'],
      ['Notes', 'a note'],
    ];
    for (const [label, text] of edits) {
      await user.type(screen.getByLabelText(label), text);
    }
    await user.type(screen.getByLabelText(/anniversary/i), '2020-05-20');

    expect(screen.getByLabelText('Company')).toHaveValue('NorthwindAcme');
    expect(screen.getByRole('region', { name: /unsaved changes/i })).toBeInTheDocument();
  });

  it('adds then removes an email', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });

    await user.click(screen.getByRole('button', { name: /add email/i }));
    await user.type(screen.getByLabelText('Email address'), 'extra@example.com');
    await user.click(screen.getByRole('button', { name: 'Confirm email' }));
    expect(await screen.findByText('extra@example.com')).toBeInTheDocument();

    const removeButtons = screen.getAllByRole('button', { name: 'Remove email' });
    await user.click(removeButtons[removeButtons.length - 1]!);
    await waitFor(() => expect(screen.queryByText('extra@example.com')).not.toBeInTheDocument());
  });

  it('adds a second phone, promotes it to identifier, then removes it', async () => {
    const { user } = setup();
    await screen.findByRole('heading', { name: 'Amit Bansal' });

    await user.click(screen.getByRole('button', { name: /add number/i }));
    await user.type(screen.getByPlaceholderText('Phone number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Confirm number' }));

    // Two phones now: the non-identifier one exposes a "Set as identifier" action.
    const promote = await screen.findByRole('button', { name: 'Set as identifier' });
    await user.click(promote);

    const removeButtons = screen.getAllByRole('button', { name: 'Remove number' });
    expect(removeButtons.length).toBeGreaterThan(0);
    await user.click(removeButtons[removeButtons.length - 1]!);
  });

  it('shows a not-found state for an unknown id', async () => {
    setup('does-not-exist');
    expect(await screen.findByText(/contact not found/i)).toBeInTheDocument();
  });
});
