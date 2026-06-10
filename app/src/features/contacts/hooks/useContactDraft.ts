import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGetContactQuery, useUpdateContactMutation } from '../api/contactsApi';
import type { Address, Contact, Phone, Professional } from '../model/types';
import { genId } from '@/lib/id';

const uid = (): string => genId('tmp');

/**
 * Loads a contact and maintains an editable draft. Exposes dirty-tracking,
 * field/array helpers, and save/discard — the engine behind the unsaved bar.
 */
export function useContactDraft(id: string) {
  const { data: contact, isLoading, isError } = useGetContactQuery(id);
  const [updateContact, { isLoading: isSaving }] = useUpdateContactMutation();
  const [draft, setDraft] = useState<Contact | null>(null);

  useEffect(() => {
    if (contact) setDraft(contact);
  }, [contact]);

  const isDirty = useMemo(
    () => Boolean(contact && draft) && JSON.stringify(contact) !== JSON.stringify(draft),
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

  const addEmail = useCallback((email: string) => {
    setDraft((d) => (d ? { ...d, emails: [...d.emails, { id: uid(), email }] } : d));
  }, []);

  const removeEmail = useCallback((emailId: string) => {
    setDraft((d) => (d ? { ...d, emails: d.emails.filter((e) => e.id !== emailId) } : d));
  }, []);

  const discard = useCallback(() => setDraft(contact ?? null), [contact]);

  const save = useCallback(async () => {
    if (!draft) return;
    await updateContact({ id, contact: draft }).unwrap();
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
    addEmail,
    removeEmail,
    discard,
    save,
  };
}
