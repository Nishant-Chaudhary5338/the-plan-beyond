import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Native date input styled to match the theme (keeps the OS picker + a11y). */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="date"
      className={cn(
        'h-11 w-full rounded-[var(--radius-field)] bg-white/5 px-3.5 text-sm text-content ring-1 ring-inset ring-line transition-colors hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-ring [color-scheme:dark]',
        className
      )}
      {...props}
    />
  );
});
