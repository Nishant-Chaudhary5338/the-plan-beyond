import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Mixed state — set when some, but not all, items in a group are selected. */
  indeterminate?: boolean;
}

/** Native checkbox with a custom visual — used for row selection and filter options. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, indeterminate = false, ...props },
  ref
) {
  const innerRef = useRef<HTMLInputElement | null>(null);

  // `indeterminate` is a DOM property with no HTML attribute, so it must be set
  // imperatively. We keep the input's a11y state in sync with the visual dash.
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <span className="relative inline-grid size-6 shrink-0 place-items-center">
      <input
        ref={setRefs}
        type="checkbox"
        aria-checked={indeterminate ? 'mixed' : undefined}
        className={cn(
          // 24px target meets WCAG 2.5.8.
          'peer size-6 cursor-pointer appearance-none rounded-md bg-white/5 ring-1 ring-inset ring-line transition-colors',
          'checked:bg-accent checked:ring-accent indeterminate:bg-accent indeterminate:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      {indeterminate ? (
        <Minus
          className="pointer-events-none absolute size-3.5 text-on-accent"
          strokeWidth={3}
          aria-hidden="true"
        />
      ) : (
        <Check
          className="pointer-events-none absolute size-3.5 text-on-accent opacity-0 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden="true"
        />
      )}
    </span>
  );
});
