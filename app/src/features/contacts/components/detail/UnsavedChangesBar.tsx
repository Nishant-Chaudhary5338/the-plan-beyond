import { AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui';

interface UnsavedChangesBarProps {
  visible: boolean;
  isSaving: boolean;
  /** Briefly true after a successful save to flash an "All changes saved" confirmation. */
  savedFlash: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

/**
 * Floating Discard/Save bar shown while the draft is dirty, plus a transient
 * "All changes saved" confirmation after a save so success is acknowledged
 * rather than the bar just vanishing (B4).
 */
export function UnsavedChangesBar({ visible, isSaving, savedFlash, onDiscard, onSave }: UnsavedChangesBarProps) {
  if (!visible && !savedFlash) return null;

  const saved = savedFlash && !visible;

  return (
    <div
      role="region"
      aria-label={saved ? 'Changes saved' : 'Unsaved changes'}
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
    >
      <div className="flex animate-fade-in items-center gap-3 rounded-full bg-overlay py-2 pl-4 pr-2 shadow-[var(--shadow-bar)] ring-1 ring-line-overlay">
        {saved ? (
          <span className="flex items-center gap-2 px-2 text-sm font-medium text-accent">
            <Check className="size-4" aria-hidden="true" />
            All changes saved
          </span>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
