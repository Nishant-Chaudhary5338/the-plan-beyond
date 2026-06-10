import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { ChevronRight, FileText, Inbox, Mail, Search } from 'lucide-react';
import { Dialog, Button, Spinner, FormErrorBanner, Avatar, toast } from '@/components/ui';
import {
  useImportVcfMutation,
  useImportGoogleMutation,
  useGetContactsQuery,
  useDeleteContactMutation,
} from '../../api/contactsApi';
import { parseVcf, type ParsedContact } from '../../utils/vcfParser';
import { GOOGLE_MOCK_CONTACTS } from '../../mocks/googleMockContacts';
import { displayName } from '../../utils/filterContacts';
import { formatPhoneDisplay } from '@/lib/phone';
import type { Contact } from '../../model/types';
import { ImportReview } from './ImportReview';

type Source = 'none' | 'google' | 'vcf';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Labeled card wrapper matching the live modal's SOURCE / NEW / CURRENT sections. */
function Section({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/3 p-4 ring-1 ring-line">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-content">{label}</h3>
        {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SourceButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-line transition-colors hover:bg-white/8"
    >
      <span className="grid size-10 place-items-center rounded-full bg-white/8 text-content">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-content">{title}</span>
        <span className="block text-xs text-faint">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 text-faint" aria-hidden="true" />
    </button>
  );
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>('none');
  const [connecting, setConnecting] = useState(false);
  const [parsed, setParsed] = useState<ParsedContact[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [currentSearch, setCurrentSearch] = useState('');

  const [importVcf, { isLoading: vcfLoading }] = useImportVcfMutation();
  const [importGoogle, { isLoading: googleLoading }] = useImportGoogleMutation();
  const { data: currentData } = useGetContactsQuery({ pageSize: 100 }, { skip: !open });
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isSaving = vcfLoading || googleLoading;

  useEffect(() => {
    if (!open) return;
    setSource('none');
    setParsed([]);
    setSelected(new Set());
    setError('');
    setConnecting(false);
    setCurrentSearch('');
  }, [open]);

  const current = useMemo(() => currentData?.items ?? [], [currentData]);
  const filteredCurrent = useMemo(() => {
    const q = currentSearch.trim().toLowerCase();
    if (!q) return current;
    return current.filter((c) => {
      const hay = [
        displayName(c),
        ...c.phones.map((p) => p.e164),
        ...c.emails.map((e) => e.email),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [current, currentSearch]);

  const loadParsed = (contacts: ParsedContact[]) => {
    setParsed(contacts);
    setSelected(new Set(contacts.map((_, i) => i)));
  };

  const readText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const contacts = parseVcf(await readText(file));
    if (contacts.length === 0) {
      setError('No contacts with a valid phone number were found in that file.');
      return;
    }
    setSource('vcf');
    setError('');
    loadParsed(contacts);
  };

  const connectGoogle = () => {
    setSource('google');
    setConnecting(true);
    window.setTimeout(() => {
      setConnecting(false);
      loadParsed(GOOGLE_MOCK_CONTACTS);
    }, 700);
  };

  const toggle = (i: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(parsed.map((_, i) => i)) : new Set());

  const onDelete = async (c: Contact) => {
    setDeletingId(c.id);
    try {
      await deleteContact(c.id).unwrap();
      toast.success(`${displayName(c)} removed`);
    } catch {
      toast.error("Couldn't remove contact");
    } finally {
      setDeletingId(null);
    }
  };

  const save = async () => {
    const chosen = parsed
      .filter((_, i) => selected.has(i))
      .map(({ firstName, lastName, countryCode, phone }) => ({ firstName, lastName, countryCode, phone }));
    if (chosen.length === 0) return;
    const mutate = source === 'google' ? importGoogle : importVcf;
    try {
      const res = await mutate({ contacts: chosen }).unwrap();
      toast.success(`Imported ${res.imported} contact${res.imported === 1 ? '' : 's'}`);
      onOpenChange(false);
    } catch {
      toast.error('Import failed. Please try again.');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import Contacts"
      description="Pick a source, then choose what to import."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="solid" onClick={save} isLoading={isSaving} disabled={selected.size === 0}>
            Save {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".vcf,text/vcard"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="space-y-4">
        <Section label="Source" hint="Pick a source to bring contacts into the New section below.">
          <div className="space-y-3">
            <SourceButton
              icon={Mail}
              title="Import from Google"
              subtitle="Sync contacts from your Google account"
              onClick={connectGoogle}
            />
            <SourceButton
              icon={FileText}
              title="Import VCF File"
              subtitle="Upload a .vcf contact file"
              onClick={() => fileRef.current?.click()}
            />
          </div>
          <FormErrorBanner message={error || undefined} className="mt-3" />
        </Section>

        <Section label="New">
          {connecting ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Spinner className="size-4" /> Connecting to Google…
            </div>
          ) : parsed.length > 0 ? (
            <ImportReview contacts={parsed} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-white/5 text-faint">
                <Inbox className="size-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-content">Pick a source above</span>
              <span className="text-xs text-faint">Use Google or VCF to bring in new contacts.</span>
            </div>
          )}
        </Section>

        <Section label={`Current (${current.length})`}>
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
              aria-hidden="true"
            />
            <input
              type="search"
              value={currentSearch}
              onChange={(e) => setCurrentSearch(e.target.value)}
              placeholder="Search by name, phone, or email"
              aria-label="Search current contacts"
              className="h-10 w-full rounded-xl bg-white/5 pl-9 pr-3 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {filteredCurrent.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">No contacts match your search.</p>
          ) : (
            <ul className="scroll-themed max-h-64 space-y-1 overflow-y-auto">
              {filteredCurrent.map((c) => {
                const name = displayName(c);
                const primary = c.phones.find((p) => p.isIdentifier) ?? c.phones[0];
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5"
                  >
                    <Avatar name={name} imageUrl={c.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-content">{name}</span>
                      <span className="block truncate text-xs text-faint">
                        {primary ? formatPhoneDisplay(primary.e164) : 'No number'}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(c)}
                      isLoading={isDeleting && deletingId === c.id}
                      disabled={isDeleting}
                    >
                      Delete
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </Dialog>
  );
}
