import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Field, type FieldProps } from '@/components/ui';

interface OptionalFieldProps {
  label: string;
  /** Current value — when empty (and not yet revealed) the field collapses to "+ Add". */
  value: string;
  required?: boolean;
  children: FieldProps['children'];
}

/**
 * Renders a labelled field, but when an *optional* field is empty it collapses
 * to a single "+ Add {label}" affordance until the user chooses to fill it
 * (UX brief B7). This is presentation only — the explicit-save model is
 * unchanged. Required fields always render as a normal field.
 */
export function OptionalField({ label, value, required, children }: OptionalFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!required && !value && !revealed) {
    return (
      <button
        type="button"
        onClick={() => {
          setRevealed(true);
          // Focus the freshly-revealed control so adding flows straight into typing.
          requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('input,textarea')?.focus());
        }}
        className="flex h-11 items-center gap-1.5 self-start text-sm text-muted transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Plus className="size-4" /> Add {label.toLowerCase()}
      </button>
    );
  }

  return (
    <div ref={ref}>
      <Field label={label} required={required}>
        {children}
      </Field>
    </div>
  );
}
