import { useMemo, useState } from 'react';
import { MapPin, Users, Search } from 'lucide-react';
import { Field, Input, Popover } from '@/components/ui';
import { SectionCard } from './SectionCard';
import { useGetContactsQuery } from '../../api/contactsApi';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { MAX_PAGE_SIZE } from '../../model/filters';
import { searchAddresses } from '../../mocks/addressSuggestions';
import { displayName } from '../../utils/filterContacts';
import type { Address, Contact } from '../../model/types';

interface AddressSectionProps {
  draft: Contact;
  patchAddress: (partial: Partial<Address>) => void;
}

function hasAddress(a: Address): boolean {
  return Boolean(a.flat || a.street || a.city || a.state || a.postalCode || a.country);
}

export function AddressSection({ draft, patchAddress }: AddressSectionProps) {
  const [query, setQuery] = useState('');
  const suggestions = useMemo(() => searchAddresses(query), [query]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const debouncedContactQuery = useDebouncedValue(contactQuery, 250);
  // Only hit the API while the picker is actually open — the detail page mounts
  // this section unconditionally, so an always-on query is wasted work.
  const { data } = useGetContactsQuery(
    { search: debouncedContactQuery, pageSize: MAX_PAGE_SIZE },
    { skip: !pickerOpen }
  );
  const sources = (data?.items ?? []).filter((c) => c.id !== draft.id && hasAddress(c.address));
  const moreAvailable = (data?.total ?? 0) > (data?.items.length ?? 0);

  const fill = (a: Address) => {
    patchAddress(a);
    setQuery('');
  };

  return (
    <SectionCard title="Address">
      <Popover
        align="end"
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        trigger={
          <button
            type="button"
            className="mb-4 flex w-full items-center gap-2 rounded-[var(--radius-field)] border border-dashed border-line px-3.5 py-3 text-sm text-muted transition-colors hover:bg-white/5 hover:text-content"
          >
            <Users className="size-4" /> Use another contact&apos;s address
          </button>
        }
      >
        <div className="w-64 p-1">
          <Input
            value={contactQuery}
            onChange={(e) => setContactQuery(e.target.value)}
            placeholder="Search contacts…"
            aria-label="Search contacts by name"
            className="mb-1 h-9"
          />
          <div className="max-h-56 overflow-y-auto">
            {sources.length ? (
              sources.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => fill(c.address)}
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-white/8"
                >
                  <span className="text-sm text-content">{displayName(c)}</span>
                  <span className="truncate text-xs text-faint">
                    {[c.address.city, c.address.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-faint">
                {debouncedContactQuery ? 'No matching contacts with an address' : 'No contacts with an address yet'}
              </p>
            )}
            {moreAvailable ? (
              <p className="px-3 py-1.5 text-xs text-faint">Search to find more contacts.</p>
            ) : null}
          </div>
        </div>
      </Popover>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-faint" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an address to auto-fill…"
          aria-label="Search for an address"
          className="pl-10"
        />
        {suggestions.length > 0 ? (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-overlay p-1.5 shadow-[var(--shadow-overlay)] ring-1 ring-line-overlay">
            {suggestions.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => fill(s)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-content hover:bg-white/8"
                >
                  <MapPin className="size-4 shrink-0 text-faint" /> {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Flat / Building">
          {(p) => <Input {...p} value={draft.address.flat} onChange={(e) => patchAddress({ flat: e.target.value })} placeholder="Enter flat/building" />}
        </Field>
        <Field label="Street / Locality">
          {(p) => <Input {...p} value={draft.address.street} onChange={(e) => patchAddress({ street: e.target.value })} placeholder="Enter street/locality" />}
        </Field>
        <Field label="City">
          {(p) => <Input {...p} value={draft.address.city} onChange={(e) => patchAddress({ city: e.target.value })} placeholder="Enter city" />}
        </Field>
        <Field label="State">
          {(p) => <Input {...p} value={draft.address.state} onChange={(e) => patchAddress({ state: e.target.value })} placeholder="Enter state" />}
        </Field>
        <Field label="Postal code">
          {(p) => <Input {...p} value={draft.address.postalCode} onChange={(e) => patchAddress({ postalCode: e.target.value })} placeholder="Enter postal code" />}
        </Field>
        <Field label="Country">
          {(p) => <Input {...p} value={draft.address.country} onChange={(e) => patchAddress({ country: e.target.value })} placeholder="Enter country" />}
        </Field>
      </div>
    </SectionCard>
  );
}
