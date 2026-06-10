import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full resize-y rounded-[var(--radius-field)] bg-white/5 px-3.5 py-2.5 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line transition-colors hover:bg-white/[0.07] focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
      {...props}
    />
  );
});
