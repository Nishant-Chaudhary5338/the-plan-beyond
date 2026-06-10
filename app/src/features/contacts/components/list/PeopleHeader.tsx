import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

interface PeopleHeaderProps {
  contactCount: number;
  trusteeCount: number;
  onAdd: () => void;
  onImport: () => void;
}

export function PeopleHeader({ contactCount, trusteeCount, onAdd, onImport }: PeopleHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl sm:text-4xl">My People</h1>
        <p className="mt-2 text-sm text-muted">
          {contactCount} {contactCount === 1 ? 'contact' : 'contacts'} · {trusteeCount} trustees
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="subtle" onClick={onImport}>
          <Download className="size-4" />
          Import
        </Button>
        <Button variant="subtle" onClick={onAdd}>
          <Plus className="size-4" />
          Add Contact
        </Button>
      </div>
    </div>
  );
}
