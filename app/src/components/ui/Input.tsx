import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const base =
  'h-11 w-full rounded-[var(--radius-field)] bg-white/5 px-3.5 text-sm text-content placeholder:text-muted ring-1 ring-inset ring-line transition-[box-shadow,background-color] duration-150 hover:bg-white/[0.07] focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, 'aria-invalid': ariaInvalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(base, invalid && 'ring-danger focus:ring-danger', className)}
      {...props}
    />
  );
});
