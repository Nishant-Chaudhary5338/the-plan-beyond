import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ContactsPanel } from './ContactsPanel';

function setup() {
  return renderWithProviders(<ContactsPanel onAdd={() => {}} />, { route: '/contacts' });
}

describe('ContactsPanel (integration)', () => {
  it('loads and lists seeded contacts with a page range', async () => {
    setup();
    expect(await screen.findByText('Amit Bansal')).toBeInTheDocument();
    expect(screen.getByText('1–25 of 30')).toBeInTheDocument();
  });

  it('filters the list as the user searches', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.type(screen.getByRole('searchbox', { name: /search contacts/i }), 'Priya');
    // Wait for the unfiltered rows to drop out, then confirm only the match remains.
    await waitFor(() => expect(screen.queryByText('Amit Bansal')).not.toBeInTheDocument());
    expect(screen.getByText('Priya Shah')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.type(screen.getByRole('searchbox', { name: /search contacts/i }), 'zzzznomatch');
    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });

  it('deletes a contact after confirmation', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.click(screen.getByRole('button', { name: 'Delete Amit Bansal' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText('Amit Bansal')).not.toBeInTheDocument());
  });

  it('selects all rows and pages through the results', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    expect(screen.getByText('1–25 of 30')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /select all contacts/i }));

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('26–30 of 30')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(await screen.findByText('1–25 of 30')).toBeInTheDocument();
  });

  it('bulk-deletes the selected contacts after confirmation', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.click(screen.getByRole('checkbox', { name: /select all contacts/i }));
    expect(screen.getByText('25 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /delete 25/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /remove 25/i }));

    // 25 of 30 removed → 5 remain, and the selection bar is gone.
    expect(await screen.findByText('1–5 of 5')).toBeInTheDocument();
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it('clears the selection when the user pages or searches', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.click(screen.getByRole('checkbox', { name: /select all contacts/i }));
    expect(screen.getByText('25 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await screen.findByText('26–30 of 30');
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
  });

  it('filters by first letter from the alphabet index', async () => {
    const { user } = setup();
    await screen.findByText('Amit Bansal');
    await user.click(screen.getByRole('button', { name: 'P' }));
    expect(await screen.findByText('Priya Shah')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Amit Bansal')).not.toBeInTheDocument());
  });
});
