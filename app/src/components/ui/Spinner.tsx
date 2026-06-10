import { cn } from '@/lib/cn';

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Accessible loading spinner. Pass a label for standalone (non-button) use. */
export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className
      )}
    />
  );
}
