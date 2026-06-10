import { useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar, Button, toast } from '@/components/ui';
import { formatPhoneDisplay } from '@/lib/phone';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useGetContactsQuery, useDeleteContactMutation } from '../../api/contactsApi';
import { MAX_PAGE_SIZE } from '../../model/filters';
import { displayName } from '../../utils/filterContacts';
import type { Contact } from '../../model/types';

/**
 * The "Current" section of the Import dialog: a server-searched, deletable list
 * of existing contacts. Self-contained (owns its search, query, and delete) so
 * the dialog itself stays focused on the import flow.
 */
export function ImportCurrentSection({ open }: { open: boolean }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isFetching } = useGetContactsQuery(
    { search: debouncedSearch, pageSize: MAX_PAGE_SIZE },
    { skip: !open }
  );
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = total > items.length;

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

  return (
    <section className="rounded-2xl bg-white/3 p-4 ring-1 ring-line">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-content">
          Current ({total})
        </h3>
      </div>

      <div className="relative mb-3">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email"
          aria-label="Search current contacts"
          className="h-10 w-full rounded-xl bg-white/5 pl-9 pr-3 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          {debouncedSearch ? 'No contacts match your search.' : 'No contacts yet.'}
        </p>
      ) : (
        <>
          <ul className="scroll-themed max-h-64 space-y-1 overflow-y-auto" aria-busy={isFetching}>
            {items.map((c) => {
              const name = displayName(c);
              const primary = c.phones.find((p) => p.isIdentifier) ?? c.phones[0];
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
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
          {hasMore ? (
            <p className="mt-2 text-center text-xs text-faint">
              Showing {items.length} of {total}. Search to narrow down.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
