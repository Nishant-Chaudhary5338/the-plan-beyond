import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ImportDialog } from './ImportDialog';

function setup() {
  const onOpenChange = vi.fn();
  const utils = renderWithProviders(<ImportDialog open onOpenChange={onOpenChange} />, {
    route: '/contacts',
  });
  return { ...utils, onOpenChange };
}

const VCF_FILE = new File(
  [
    `BEGIN:VCARD\nVERSION:3.0\nFN:Test Import\nN:Import;Test;;;\nTEL:+919876512399\nEND:VCARD`,
  ],
  'contacts.vcf',
  { type: 'text/vcard' }
);

describe('ImportDialog (integration)', () => {
  it('starts with the empty source prompt', () => {
    setup();
    expect(screen.getByText(/pick a source above/i)).toBeInTheDocument();
  });

  it('connects to Google (mock) and lists contacts to import', async () => {
    const { user } = setup();
    await user.click(screen.getByText('Import from Google'));
    expect(await screen.findByText('Rohan Mehta', {}, { timeout: 2000 })).toBeInTheDocument();
    // All parsed contacts are pre-selected; the footer save button reflects the count.
    expect(screen.getByRole('button', { name: /save \(5\)/i })).toBeEnabled();
  });

  it('imports selected Google contacts and closes', async () => {
    const { user, onOpenChange } = setup();
    await user.click(screen.getByText('Import from Google'));
    await screen.findByText('Rohan Mehta', {}, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: /^Save \(/ }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('parses an uploaded VCF file', async () => {
    setup();
    // The dialog (and its file input) renders in a portal on document.body.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [VCF_FILE] } });
    expect(await screen.findByText('Test Import')).toBeInTheDocument();
  });

  it('lists existing contacts in the Current section and filters them by search', async () => {
    const { user } = setup();
    expect(await screen.findByText('Amit Bansal')).toBeInTheDocument();
    expect(screen.getByText('Ananya Iyer')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: /search current contacts/i }), 'Amit');
    await waitFor(() => expect(screen.queryByText('Ananya Iyer')).not.toBeInTheDocument());
    expect(screen.getByText('Amit Bansal')).toBeInTheDocument();
  });

  it('deletes an existing contact from the Current section', async () => {
    const { user } = setup();
    const row = (await screen.findByText('Amit Bansal')).closest('li');
    expect(row).not.toBeNull();
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Amit Bansal')).not.toBeInTheDocument());
  });
});
