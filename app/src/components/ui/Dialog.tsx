import type { ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Accessible modal (focus-trap, Esc, scroll-lock via Radix) with our overlay styling. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out" />
        {/* Center via grid (not a transform) so the entrance/exit keyframes own
            `transform` outright — avoids the translate-vs-transform double-shift. */}
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <RadixDialog.Content
            className={cn(
              // Cap height to the viewport and let the body scroll internally so a
              // tall modal (e.g. Import) never overflows or hides its footer.
              'flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col',
              'rounded-3xl bg-overlay shadow-[var(--shadow-overlay)] ring-1 ring-line-overlay',
              'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
              'focus:outline-none',
              className
            )}
          >
          <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
            <div className="space-y-1">
              <RadixDialog.Title className="text-center text-xl font-semibold sm:text-left">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="text-sm text-muted">
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label="Close" size="sm" className="-mr-1 -mt-1">
                <X className="size-4" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          <div className={cn('scroll-themed min-h-0 flex-1 overflow-y-auto px-6', !footer && 'pb-6')}>
            {children}
          </div>
          {footer ? <div className="flex justify-end gap-3 px-6 pb-6 pt-4">{footer}</div> : null}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
