import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserX } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, Skeleton, toast } from '@/components/ui';
import { useContactDraft } from '../hooks/useContactDraft';
import { useUnsavedGuard } from '../hooks/useUnsavedGuard';
import { useDeleteContactMutation } from '../api/contactsApi';
import { displayName } from '../utils/filterContacts';
import { ContactDetailHeader } from '../components/detail/ContactDetailHeader';
import { ContactInfoCard } from '../components/detail/ContactInfoCard';
import { RolesSettingsSection } from '../components/detail/RolesSettingsSection';
import { NotesSection } from '../components/detail/NotesSection';
import { HistorySection } from '../components/detail/HistorySection';
import { PersonalInfoSection } from '../components/detail/PersonalInfoSection';
import { AddressSection } from '../components/detail/AddressSection';
import { ProfessionalSection } from '../components/detail/ProfessionalSection';
import { UnsavedChangesBar } from '../components/detail/UnsavedChangesBar';

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 py-8">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const draftApi = useContactDraft(id);
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const { draft, isLoading, isError } = draftApi;
  // Block back-link / sidebar / browser navigation while there are unsaved edits.
  const blocker = useUnsavedGuard(draftApi.isDirty);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !draft) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <div className="panel">
          <EmptyState
            icon={UserX}
            title="Contact not found"
            description="This contact may have been removed."
            action={<Button onClick={() => navigate('/contacts')}>Back to My People</Button>}
          />
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await draftApi.save();
      // Acknowledge success in the bar (B4) rather than letting it silently vanish.
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2500);
    } catch {
      toast.error("Couldn't save changes");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(id).unwrap();
      toast.success(`${displayName(draft)} removed`);
      navigate('/contacts');
    } catch {
      toast.error("Couldn't remove contact");
      setConfirmOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl py-8 pb-28">
      <ContactDetailHeader
        contact={draft}
        onDelete={() => setConfirmOpen(true)}
        onAvatarChange={(url) => draftApi.patch({ avatarUrl: url })}
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-6">
          <ContactInfoCard
            draft={draft}
            addPhone={draftApi.addPhone}
            removePhone={draftApi.removePhone}
            setIdentifier={draftApi.setIdentifier}
            setPhoneType={draftApi.setPhoneType}
            addEmail={draftApi.addEmail}
            removeEmail={draftApi.removeEmail}
          />
          <RolesSettingsSection draft={draft} patch={draftApi.patch} />
          <NotesSection draft={draft} patch={draftApi.patch} />
          <HistorySection contact={draft} />
        </div>
        <div className="flex flex-col gap-6">
          <PersonalInfoSection draft={draft} patch={draftApi.patch} />
          <AddressSection draft={draft} patchAddress={draftApi.patchAddress} />
          <ProfessionalSection draft={draft} patchProfessional={draftApi.patchProfessional} />
        </div>
      </div>

      <UnsavedChangesBar
        visible={draftApi.isDirty}
        isSaving={draftApi.isSaving}
        savedFlash={savedFlash}
        onDiscard={draftApi.discard}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove contact?"
        description={`${displayName(draft)} will be removed from My People.`}
        confirmLabel="Remove"
        destructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      {/* Unsaved-changes navigation guard (B4). */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') blocker.reset();
        }}
        title="Leave with unsaved changes?"
        description="You have unsaved changes — they’ll be lost if you leave without saving."
        confirmLabel="Leave without saving"
        cancelLabel="Stay"
        destructive
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
      />
    </div>
  );
}
