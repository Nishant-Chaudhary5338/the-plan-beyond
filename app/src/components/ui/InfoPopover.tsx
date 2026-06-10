import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Popover } from './Popover';

export interface InfoPopoverProps {
  /** Accessible name for the trigger, e.g. "Trustees" → "About Trustees". */
  label: string;
  /** Plain one-sentence definition. */
  definition: string;
  /** Optional grounding example shown beneath the definition. */
  example?: string;
  /** Heading shown in the popover; defaults to `label`. */
  title?: string;
  className?: string;
}

/**
 * A small ⓘ affordance that explains a term in-context (UX brief A2/B2).
 * Keyboard-openable and dismissable via the underlying Radix Popover; the hit
 * target is 44px (negative margin keeps the visual footprint tight inline).
 */
export function InfoPopover({ label, definition, example, title, className }: InfoPopoverProps) {
  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          aria-label={`About ${label}`}
          className={cn(
            '-m-2 grid size-11 shrink-0 place-items-center rounded-full text-faint transition-colors',
            'hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      }
    >
      <div className="w-64 p-1">
        <p className="px-2 py-1 text-sm font-medium text-content">{title ?? label}</p>
        <p className="px-2 text-sm text-muted">{definition}</p>
        {example ? <p className="mt-1.5 px-2 pb-1 text-xs text-faint">{example}</p> : null}
      </div>
    </Popover>
  );
}
