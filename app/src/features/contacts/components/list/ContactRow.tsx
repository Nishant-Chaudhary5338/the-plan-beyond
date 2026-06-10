import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Badge, Checkbox, IconButton } from '@/components/ui';
import { formatPhoneDisplay } from '@/lib/phone';
import { displayName } from '../../utils/filterContacts';
import type { Contact } from '../../model/types';

interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (contact: Contact) => void;
}

export function ContactRow({ contact, selected, onToggleSelect, onDelete }: ContactRowProps) {
  const navigate = useNavigate();
  const name = displayName(contact);
  const primary = contact.phones.find((p) => p.isIdentifier) ?? contact.phones[0];
  const email = contact.emails[0]?.email;
  const open = () => navigate(`/contacts/${contact.id}`);

  return (
    <tr
      onClick={open}
      className={cn(
        'group cursor-pointer border-t border-line transition-colors hover:bg-white/[0.04]',
        '[&>td]:align-middle',
        selected && 'bg-emerald-500/[0.07]'
      )}
    >
      <td className="w-12 py-3 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={() => onToggleSelect(contact.id)}
          aria-label={`Select ${name}`}
        />
      </td>
      <td className="py-3 pr-3">
        <div className="flex items-center gap-3">
          <Avatar name={name} imageUrl={contact.avatarUrl} size="sm" />
          <div className="min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
              className="block truncate text-left font-medium text-content hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {name}
            </button>
            {primary ? (
              <span className="block truncate text-xs text-faint sm:hidden">
                {formatPhoneDisplay(primary.e164)}
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden py-3 pr-3 sm:table-cell">
        <div className="text-sm text-content">{primary ? formatPhoneDisplay(primary.e164) : '—'}</div>
        <div className="text-xs text-faint">{email ?? 'No email'}</div>
      </td>
      <td className="hidden py-3 pr-3 md:table-cell">
        {contact.groups.length ? (
          <div className="flex flex-wrap gap-1">
            {contact.groups.slice(0, 2).map((g) => (
              <Badge key={g}>{g}</Badge>
            ))}
            {contact.groups.length > 2 ? <Badge>+{contact.groups.length - 2}</Badge> : null}
          </div>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="hidden py-3 pr-3 lg:table-cell">
        {contact.isBeyondCircle ? <Badge variant="accent">On</Badge> : <span className="text-faint">Off</span>}
      </td>
      <td className="py-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
        <IconButton
          label={`Delete ${name}`}
          variant="danger"
          size="sm"
          className="opacity-100 transition-opacity group-focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          onClick={() => onDelete(contact)}
        >
          <Trash2 className="size-4" />
        </IconButton>
      </td>
    </tr>
  );
}
