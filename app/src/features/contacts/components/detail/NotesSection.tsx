import { Textarea } from '@/components/ui';
import { SectionCard } from './SectionCard';
import type { Contact } from '../../model/types';

interface NotesSectionProps {
  draft: Contact;
  patch: (partial: Partial<Contact>) => void;
}

export function NotesSection({ draft, patch }: NotesSectionProps) {
  return (
    <SectionCard title="Notes">
      <Textarea
        value={draft.notes}
        onChange={(e) => patch({ notes: e.target.value })}
        placeholder="Add your notes here…"
        rows={6}
        aria-label="Notes"
        className="min-h-36"
      />
    </SectionCard>
  );
}
