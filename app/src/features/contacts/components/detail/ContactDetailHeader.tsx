import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Send, Trash2, MoreHorizontal } from 'lucide-react';
import { Avatar, Badge, Button, IconButton, Popover, toast } from '@/components/ui';
import { formatPhoneDisplay } from '@/lib/phone';
import { formatDate } from '@/lib/format';
import { displayName } from '../../utils/filterContacts';
import type { Contact } from '../../model/types';

interface ContactDetailHeaderProps {
  contact: Contact;
  onDelete: () => void;
}

export function ContactDetailHeader({ contact, onDelete }: ContactDetailHeaderProps) {
  const name = displayName(contact) || 'New contact';
  const primary = contact.phones.find((p) => p.isIdentifier) ?? contact.phones[0];
  const [menuOpen, setMenuOpen] = useState(false);

  // Read-only standing chips (B1) — editing stays in the Roles card. Unset roles
  // are simply omitted.
  const hasChips =
    Boolean(contact.relationship) ||
    contact.groups.length > 0 ||
    contact.isEmergencyContact ||
    contact.isBeyondCircle;

  return (
    <div>
      <Link
        to="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-content"
      >
        <ChevronLeft className="size-4" /> My People
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} imageUrl={contact.avatarUrl} size="lg" />
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl">{name}</h1>

            {hasChips ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {contact.relationship ? <Badge>{contact.relationship}</Badge> : null}
                {contact.groups.map((g) => (
                  <Badge key={g}>{g}</Badge>
                ))}
                {contact.isEmergencyContact ? <Badge variant="warning">Emergency contact</Badge> : null}
                {contact.isBeyondCircle ? <Badge variant="accent">In your Beyond Circle</Badge> : null}
              </div>
            ) : null}

            <p className="mt-2 text-sm text-faint">
              {primary ? formatPhoneDisplay(primary.e164) : 'No number'}
              {contact.createdAt ? ` · Added ${formatDate(contact.createdAt)}` : ''}
              {' · Not yet invited'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* TODO(scope): wire to the real product-invite endpoint when it exists.
              Until then this is honest about being out of scope rather than a dead button. */}
          <Button
            variant="subtle"
            onClick={() => toast.info('Product invites land in a later milestone — this build ships “My People”.')}
          >
            <Send className="size-4" />
            Invite to The Plan Beyond
          </Button>

          {/* Delete lives in an overflow menu, away from the primary action, so it
              can't be mis-clicked next to Invite (B5). The confirm modal is unchanged. */}
          <Popover
            open={menuOpen}
            onOpenChange={setMenuOpen}
            align="end"
            trigger={
              <IconButton label="More actions" variant="ghost">
                <MoreHorizontal className="size-5" />
              </IconButton>
            }
          >
            <div role="menu" aria-label="Contact actions" className="w-48 p-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-surface focus-visible:bg-danger-surface focus-visible:outline-none"
              >
                <Trash2 className="size-4" /> Delete contact
              </button>
            </div>
          </Popover>
        </div>
      </div>
    </div>
  );
}
