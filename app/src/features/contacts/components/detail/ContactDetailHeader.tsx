import { Link } from 'react-router-dom';
import { ChevronLeft, Send, Trash2 } from 'lucide-react';
import { Avatar, Button, IconButton } from '@/components/ui';
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

  return (
    <div>
      <Link
        to="/contacts"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-content"
      >
        <ChevronLeft className="size-4" /> My People
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={name} imageUrl={contact.avatarUrl} size="lg" />
          <div>
            <h1 className="text-3xl sm:text-4xl">{name}</h1>
            <p className="mt-1 text-sm text-muted">
              {primary ? formatPhoneDisplay(primary.e164) : 'No number'}
              {contact.createdAt ? ` · Since ${formatDate(contact.createdAt)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle">
            <Send className="size-4" />
            Invite to The Plan Beyond
          </Button>
          <IconButton label={`Delete ${name}`} variant="danger" onClick={onDelete}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
