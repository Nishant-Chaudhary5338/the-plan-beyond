import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog, Avatar, Button, Input, Spinner, toast } from '@/components/ui';
import { formatPhoneDisplay } from '@/lib/phone';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { MAX_PAGE_SIZE } from '../../model/filters';
import { useGetContactsQuery, useInviteTrusteeMutation } from '../../api/contactsApi';
import { getApiErrorMessage } from '../../api/apiError';
import { displayName } from '../../utils/filterContacts';

interface InviteTrusteeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Pick a contact to invite as a trustee (`POST /trustees/invite`). */
export function InviteTrusteeDialog({ open, onOpenChange }: InviteTrusteeDialogProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } = useGetContactsQuery(
    { search: debouncedSearch, pageSize: MAX_PAGE_SIZE },
    { skip: !open }
  );
  const [inviteTrustee, { isLoading: isInviting }] = useInviteTrusteeMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = total > items.length;

  const invite = async (id: string, name: string) => {
    setPendingId(id);
    try {
      await inviteTrustee(id).unwrap();
      toast.success(`Trustee invite sent to ${name}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't send the invite"));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite a trustee"
      description="Trustees verify and protect your account. Pick someone you trust."
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden="true" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts…"
          aria-label="Search contacts to invite"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid h-40 place-items-center">
          <Spinner className="size-5 text-muted" label="Loading contacts" />
        </div>
      ) : items.length === 0 ? (
        <p className="grid h-40 place-items-center text-sm text-faint">
          {debouncedSearch ? 'No contacts match your search.' : 'No contacts yet.'}
        </p>
      ) : (
        <>
          <ul className="scroll-themed max-h-80 space-y-1 overflow-y-auto" aria-busy={isFetching}>
            {items.map((c) => {
              const name = displayName(c);
              const primary = c.phones.find((p) => p.isIdentifier) ?? c.phones[0];
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                  <Avatar name={name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-content">{name}</span>
                    <span className="block truncate text-xs text-faint">
                      {primary ? formatPhoneDisplay(primary.e164) : 'No number'}
                    </span>
                  </span>
                  <Button
                    variant="subtle"
                    size="sm"
                    isLoading={isInviting && pendingId === c.id}
                    disabled={isInviting}
                    onClick={() => invite(c.id, name)}
                  >
                    Invite
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
    </Dialog>
  );
}
