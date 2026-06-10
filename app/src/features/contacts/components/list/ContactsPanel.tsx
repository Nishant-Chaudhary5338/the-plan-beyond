import { useState } from 'react';
import { Search, Users, SearchX, AlertTriangle } from 'lucide-react';
import { Button, EmptyState, toast } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useContactsQuery } from '../../hooks/useContactsQuery';
import { useDeleteContactMutation } from '../../api/contactsApi';
import {
  setFilter,
  setPage,
  toggleSelected,
  setSelectedMany,
  clearSelected,
} from '../../model/contactsSlice';
import { activeFilterCount, type SortKey, type LetterFilter } from '../../model/filters';
import { ConfirmDialog } from '@/components/ui';
import { SegmentFilters } from './SegmentFilters';
import { AlphabetIndex } from './AlphabetIndex';
import { SortMenu } from './SortMenu';
import { ContactsTable } from './ContactsTable';
import { ContactsPagination } from './ContactsPagination';
import { displayName } from '../../utils/filterContacts';
import type { Contact } from '../../model/types';

export function ContactsPanel({ onAdd }: { onAdd: () => void }) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((s) => s.contactsUi.selectedIds);
  const { data, isLoading, isFetching, isError, refetch, filters } = useContactsQuery();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasQuery = filters.search.trim() !== '' || activeFilterCount(filters) > 0;

  const onToggleAll = (checked: boolean) =>
    dispatch(checked ? setSelectedMany(items.map((c) => c.id)) : clearSelected());

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const name = displayName(pendingDelete);
    try {
      await deleteContact(pendingDelete.id).unwrap();
      toast.success(`${name} removed`);
    } catch {
      toast.error(`Couldn't remove ${name}`);
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <section className="panel flex min-h-112 min-w-0 flex-col lg:h-full lg:min-h-0" aria-label="Contacts">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">Contacts</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => dispatch(setFilter({ key: 'search', value: e.target.value }))}
              placeholder="Search contacts…"
              aria-label="Search contacts"
              className="h-10 w-full rounded-full bg-white/5 pl-9 pr-3 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <SegmentFilters />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AlphabetIndex
            value={filters.letter}
            onChange={(letter: LetterFilter) => dispatch(setFilter({ key: 'letter', value: letter }))}
          />
          <SortMenu
            value={filters.sort}
            onChange={(sort: SortKey) => dispatch(setFilter({ key: 'sort', value: sort }))}
          />
        </div>
      </div>

      <div className="scroll-themed min-h-0 flex-1 overflow-auto" aria-busy={isFetching}>
        {isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load contacts"
            description="Something went wrong reaching the server. Check your connection and try again."
            action={
              <Button variant="subtle" onClick={() => refetch()}>
                Try again
              </Button>
            }
          />
        ) : !isLoading && total === 0 ? (
          hasQuery ? (
            <EmptyState
              icon={SearchX}
              title="No matches"
              description="No contacts match your search and filters. Try clearing them."
              action={
                <Button variant="subtle" onClick={() => dispatch(setFilter({ key: 'search', value: '' }))}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No people yet"
              description="Add a contact to start building your network — trustees, keyholders, and your notify circle all start here."
              action={<Button onClick={onAdd}>+ Add Contact</Button>}
            />
          )
        ) : (
          <ContactsTable
            items={items}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onToggleSelect={(id) => dispatch(toggleSelected(id))}
            onToggleAll={onToggleAll}
            onDelete={setPendingDelete}
          />
        )}
      </div>

      {total > 0 ? (
        <div className="border-t border-line">
          <ContactsPagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={(p) => dispatch(setPage(p))}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove contact?"
        description={pendingDelete ? `${displayName(pendingDelete)} will be removed from My People.` : ''}
        confirmLabel="Remove"
        destructive
        isLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
