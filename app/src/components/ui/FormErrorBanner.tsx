import { cn } from '@/lib/cn';

/** Inline form/server error with a shake-on-appear. Returns null when empty. */
export function FormErrorBanner({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        'animate-shake rounded-xl bg-danger-surface px-3.5 py-2.5 text-sm text-danger ring-1 ring-danger-line',
        className
      )}
    >
      {message}
    </p>
  );
}
