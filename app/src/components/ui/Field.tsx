import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  /** Render the control; receives the generated id + aria props to spread. */
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
}

/** Labelled form field: uppercase label, optional hint, accessible error wiring. */
export function Field({ label, children, required, hint, error, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-muted"
      >
        {label}
        {required ? <span className="ml-0.5 text-accent">*</span> : null}
      </label>
      {children({
        id,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
