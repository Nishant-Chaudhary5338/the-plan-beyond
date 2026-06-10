import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface UnsavedChangesBarProps {
  visible: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/** Floating Discard/Save bar that appears only when the draft is dirty. */
export function UnsavedChangesBar({ visible, isSaving, onDiscard, onSave }: UnsavedChangesBarProps) {
  if (!visible) return null;
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
    >
      <div className="flex animate-fade-in items-center gap-3 rounded-full bg-overlay py-2 pl-4 pr-2 shadow-[var(--shadow-bar)] ring-1 ring-line-overlay">
        <span className="flex items-center gap-2 text-sm font-medium text-warning">
          <AlertCircle className="size-4" aria-hidden="true" />
          Unsaved changes
        </span>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={isSaving}>
          Discard
        </Button>
        <Button variant="solid" size="sm" onClick={onSave} isLoading={isSaving}>
          Save
        </Button>
      </div>
    </div>
  );
}
