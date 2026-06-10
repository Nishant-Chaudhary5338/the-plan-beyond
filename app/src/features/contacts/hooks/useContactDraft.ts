import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetContactQuery, useUpdateContactMutation } from '../api/contactsApi';
import type { Address, Contact, Phone, Professional } from '../model/types';
import { genId } from '@/lib/id';
import { deepEqual } from '@/lib/deepEqual';

const uid = (): string => genId('tmp');

/**
 * Loads a contact and maintains an editable draft. Exposes dirty-tracking,
 * field/array helpers, and save/discard — the engine behind the unsaved bar.
 */
export function useContactDraft(id: string) {
  const { data: contact, isLoading, isError } = useGetContactQuery(id);
  const [updateContact, { isLoading: isSaving }] = useUpdateContactMutation();
  const [draft, setDraft] = useState<Contact | null>(null);

  // The draft is the user's working copy and is owned locally. Initialise it
  // from the server only on first load or when navigating to a *different*
  // contact — NOT on every cache change, so a background refetch or an
  // optimistic-update rollback can't silently wipe in-progress edits. After a
  // successful save we reconcile the draft explicitly (see `save`).
  const loadedId = useRef<string | null>(null);
  useEffect(() => {
    if (contact && loadedId.current !== contact.id) {
      loadedId.current = contact.id;
      setDraft(contact);
    }
  }, [contact]);

  const isDirty = useMemo(
    () => Boolean(contact && draft) && !deepEqual(contact, draft),
    [contact, draft]
  );

  const patch = useCallback((partial: Partial<Contact>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  }, []);

  const patchAddress = useCallback((partial: Partial<Address>) => {
    setDraft((d) => (d ? { ...d, address: { ...d.address, ...partial } } : d));
  }, []);

  const patchProfessional = useCallback((partial: Partial<Professional>) => {
    setDraft((d) => (d ? { ...d, professional: { ...d.professional, ...partial } } : d));
  }, []);

  const addPhone = useCallback((phone: Omit<Phone, 'id'>) => {
    setDraft((d) => (d ? { ...d, phones: [...d.phones, { ...phone, id: uid() }] } : d));
  }, []);

  const removePhone = useCallback((phoneId: string) => {
    setDraft((d) => (d ? { ...d, phones: d.phones.filter((p) => p.id !== phoneId) } : d));
  }, []);

  const setIdentifier = useCallback((phoneId: string) => {
    setDraft((d) =>
      d ? { ...d, phones: d.phones.map((p) => ({ ...p, isIdentifier: p.id === phoneId })) } : d
    );
  }, []);

  const setPhoneType = useCallback((phoneId: string, phoneType: string) => {
    setDraft((d) =>
      d ? { ...d, phones: d.phones.map((p) => (p.id === phoneId ? { ...p, phoneType } : p)) } : d
    );
  }, []);

  const addEmail = useCallback((email: string) => {
    setDraft((d) => (d ? { ...d, emails: [...d.emails, { id: uid(), email }] } : d));
  }, []);

  const removeEmail = useCallback((emailId: string) => {
    setDraft((d) => (d ? { ...d, emails: d.emails.filter((e) => e.id !== emailId) } : d));
  }, []);

  const discard = useCallback(() => setDraft(contact ?? null), [contact]);

  const save = useCallback(async () => {
    if (!draft) return;
    // Reconcile the draft with the server's canonicalised response on success;
    // on failure this throws and the draft keeps the user's edits for a retry.
    const saved = await updateContact({ id, contact: draft }).unwrap();
    setDraft(saved);
  }, [draft, id, updateContact]);

  return {
    contact,
    draft,
    isLoading,
    isError,
    isDirty,
    isSaving,
    patch,
    patchAddress,
    patchProfessional,
    addPhone,
    removePhone,
    setIdentifier,
    setPhoneType,
    addEmail,
    removeEmail,
    discard,
    save,
  };
}
