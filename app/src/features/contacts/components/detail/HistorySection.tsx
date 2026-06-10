import { SectionCard } from './SectionCard';
import { formatDate } from '@/lib/format';
import type { Contact } from '../../model/types';

interface HistorySectionProps {
  contact: Contact;
}

type Entry = { label: string; date: string };

/**
 * A quiet, honest trust trail (A-P1.6). It only shows events we genuinely know —
 * when the contact was added and any real invite milestones the server reports.
 * We deliberately don't fabricate "role changed" entries we don't track: on a
 * product about who can reach into your life, an invented history would erode
 * the very trust this is meant to build.
 */
function buildEntries(contact: Contact): Entry[] {
  const entries: Entry[] = [];
  if (contact.createdAt) entries.push({ label: 'Added to My People', date: contact.createdAt });
  const invite = contact.invite;
  if (invite?.invitedAt) entries.push({ label: 'Invited to The Plan Beyond', date: invite.invitedAt });
  if (invite?.joinedAt) entries.push({ label: 'Joined The Plan Beyond', date: invite.joinedAt });
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function HistorySection({ contact }: HistorySectionProps) {
  const entries = buildEntries(contact);
  if (entries.length === 0) return null;

  return (
    <SectionCard title="History" collapsible defaultCollapsed>
      <ol className="space-y-3">
        {entries.map((entry) => (
          <li key={`${entry.label}-${entry.date}`} className="flex items-start gap-3">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            />
            <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span className="text-sm text-content">{entry.label}</span>
              <span className="shrink-0 text-xs text-faint">{formatDate(entry.date)}</span>
            </span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
