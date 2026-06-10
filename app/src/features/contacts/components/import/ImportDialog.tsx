import { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { ChevronRight, FileText, Inbox, Mail } from 'lucide-react';
import { Dialog, Button, Spinner, FormErrorBanner, toast } from '@/components/ui';
import { useImportVcfMutation, useImportGoogleMutation } from '../../api/contactsApi';
import { parseVcf, type ParsedContact } from '../../utils/vcfParser';
import { GOOGLE_MOCK_CONTACTS } from '../../mocks/googleMockContacts';
import { ImportReview } from './ImportReview';
import { ImportCurrentSection } from './ImportCurrentSection';

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

  const [importVcf, { isLoading: vcfLoading }] = useImportVcfMutation();
  const [importGoogle, { isLoading: googleLoading }] = useImportGoogleMutation();
  const isSaving = vcfLoading || googleLoading;

  useEffect(() => {
    if (!open) return;
    setSource('none');
    setParsed([]);
    setSelected(new Set());
    setError('');
    setConnecting(false);
  }, [open]);

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
    let text: string;
    try {
      text = await readText(file);
    } catch {
      setError("Couldn't read that file. Please try again with a valid .vcf file.");
      return;
    }
    const contacts = parseVcf(text);
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

        <ImportCurrentSection open={open} />
      </div>
    </Dialog>
  );
}
