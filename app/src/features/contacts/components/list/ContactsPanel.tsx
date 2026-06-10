import { useCallback, useState } from 'react';
import { Search, Users, SearchX, AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useContactsQuery } from '../../hooks/useContactsQuery';
import { useContactDeletion } from '../../hooks/useContactDeletion';
import { useContactsStats } from '../../hooks/useContactsStats';
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

export function ContactsPanel({ onAdd }: { onAdd: () => void }) {
  const dispatch = useAppDispatch();
  const selectedIds = useAppSelector((s) => s.contactsUi.selectedIds);
  const { data, isLoading, isFetching, isError, refetch, filters } = useContactsQuery();
  const { available_letters, contacts: { total: peopleTotal } } = useContactsStats();
  const { pendingDelete, setPendingDelete, confirmDelete, deleteMany, isDeleting } =
    useContactDeletion();
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasQuery = filters.search.trim() !== '' || activeFilterCount(filters) > 0;
  const selectedCount = selectedIds.length;

  const onToggleAll = (checked: boolean) =>
    dispatch(checked ? setSelectedMany(items.map((c) => c.id)) : clearSelected());

  // Stable handler so the memoised ContactRow doesn't re-render on every keystroke.
  const onToggleSelect = useCallback((id: string) => dispatch(toggleSelected(id)), [dispatch]);

  const confirmBulkDelete = async () => {
    await deleteMany([...selectedIds]);
    dispatch(clearSelected());
    setBulkConfirm(false);
  };

  return (
    <section className="panel flex min-h-112 min-w-0 flex-col lg:h-full lg:min-h-0" aria-label="Contacts">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">Contacts</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => dispatch(setFilter({ key: 'search', value: e.target.value }))}
              placeholder={peopleTotal > 0 ? `Filter these ${peopleTotal} people…` : 'Filter contacts…'}
              aria-label="Search contacts"
              className="h-10 w-full rounded-full bg-white/5 pl-9 pr-3 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <SegmentFilters />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AlphabetIndex
            value={filters.letter}
            availableLetters={available_letters}
            onChange={(letter: LetterFilter) => dispatch(setFilter({ key: 'letter', value: letter }))}
          />
          <SortMenu
            value={filters.sort}
            onChange={(sort: SortKey) => dispatch(setFilter({ key: 'sort', value: sort }))}
          />
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-white/[0.03] px-4 py-2.5">
          <p className="text-sm text-content" aria-live="polite">
            {selectedCount} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => dispatch(clearSelected())}>
              <X className="size-4" /> Clear
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkConfirm(true)}>
              <Trash2 className="size-4" /> Delete {selectedCount}
            </Button>
          </div>
        </div>
      ) : null}

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
            onToggleSelect={onToggleSelect}
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

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={(open) => !open && setBulkConfirm(false)}
        title={`Remove ${selectedCount} contact${selectedCount === 1 ? '' : 's'}?`}
        description={`The selected contact${selectedCount === 1 ? '' : 's'} will be removed from My People. This can't be undone.`}
        confirmLabel={`Remove ${selectedCount}`}
        destructive
        isLoading={isDeleting}
        onConfirm={confirmBulkDelete}
      />
    </section>
  );
}
