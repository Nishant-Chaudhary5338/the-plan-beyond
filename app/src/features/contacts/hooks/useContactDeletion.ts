import { useCallback, useState } from 'react';
import { toast } from '@/components/ui';
import { useDeleteContactMutation } from '../api/contactsApi';
import { displayName } from '../utils/filterContacts';
import type { Contact } from '../model/types';

/**
 * Encapsulates single- and bulk-contact deletion: the pending-delete target,
 * confirm handlers, toasts, and loading state. Keeps deletion logic out of the
 * list panel so the component stays presentational.
 */
export function useContactDeletion() {
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);

  const confirmDelete = useCallback(async () => {
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
  }, [pendingDelete, deleteContact]);

  /** Delete many in parallel; resolves to the number actually removed. */
  const deleteMany = useCallback(
    async (ids: string[]): Promise<number> => {
      const results = await Promise.allSettled(ids.map((id) => deleteContact(id).unwrap()));
      const removed = results.filter((r) => r.status === 'fulfilled').length;
      if (removed === ids.length) {
        toast.success(`${removed} contact${removed === 1 ? '' : 's'} removed`);
      } else {
        toast.error(`Removed ${removed} of ${ids.length} — some couldn't be deleted`);
      }
      return removed;
    },
    [deleteContact]
  );

  return { pendingDelete, setPendingDelete, confirmDelete, deleteMany, isDeleting };
}
