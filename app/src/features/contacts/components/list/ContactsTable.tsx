import { useMemo } from 'react';
import { Checkbox, Skeleton } from '@/components/ui';
import { ContactRow } from './ContactRow';
import type { Contact } from '../../model/types';

interface ContactsTableProps {
  items: Contact[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onDelete: (contact: Contact) => void;
}

function HeaderCell({ label, className }: { label: string; className?: string }) {
  return (
    <th scope="col" className={`py-3 pr-3 align-middle text-xs font-semibold uppercase tracking-wider text-faint ${className ?? ''}`}>
      {label}
    </th>
  );
}

export function ContactsTable({
  items,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onDelete,
}: ContactsTableProps) {
  // Set membership keeps select-all and per-row checks O(1) instead of O(n²).
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedOnPage = items.reduce((n, c) => (selectedSet.has(c.id) ? n + 1 : n), 0);
  const allSelected = items.length > 0 && selectedOnPage === items.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr>
          <th scope="col" className="w-12 py-3 pl-4 pr-2 align-middle">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(e) => onToggleAll(e.target.checked)}
              aria-label="Select all contacts on this page"
            />
            <span className="sr-only">Select</span>
          </th>
          <HeaderCell label="Name" />
          <HeaderCell label="Contact" className="hidden sm:table-cell" />
          <HeaderCell label="Roles/Groups" className="hidden md:table-cell" />
          <HeaderCell label="Beyond Circle" className="hidden lg:table-cell" />
          <th scope="col" className="w-12">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-4 pl-4">
                  <Skeleton className="size-[18px] rounded-md" />
                </td>
                <td className="py-4 pr-3" colSpan={5}>
                  <Skeleton className="h-4 w-48" />
                </td>
              </tr>
            ))
          : items.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                selected={selectedSet.has(contact.id)}
                onToggleSelect={onToggleSelect}
                onDelete={onDelete}
              />
            ))}
      </tbody>
    </table>
  );
}
