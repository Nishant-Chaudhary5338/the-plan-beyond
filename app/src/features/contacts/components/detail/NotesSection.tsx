import { Textarea } from '@/components/ui';
import { SectionCard } from './SectionCard';
import type { Contact } from '../../model/types';

interface NotesSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

export function NotesSection({ draft, patch }: NotesSectionProps) {
  return (
    // Grow to fill the left column so the card ends level with the right column.
    <SectionCard title="Notes" className="lg:flex lg:flex-1 lg:flex-col">
      <Textarea
        value={draft.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        placeholder="Add your notes here…"
        rows={6}
        aria-label="Notes"
        className="lg:flex-1 lg:resize-none"
      />
    </SectionCard>
  );
}
