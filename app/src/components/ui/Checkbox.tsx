import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Native checkbox with a custom visual — used for row selection and filter options. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref
) {
  return (
    <span className="relative inline-grid size-6 shrink-0 place-items-center">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          // 24px target meets WCAG 2.5.8.
          'peer size-6 cursor-pointer appearance-none rounded-md bg-white/5 ring-1 ring-inset ring-line transition-colors',
          'checked:bg-accent checked:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
      <Check
        className="pointer-events-none absolute size-3.5 text-on-accent opacity-0 peer-checked:opacity-100"
        strokeWidth={3}
        aria-hidden="true"
      />
    </span>
  );
});
