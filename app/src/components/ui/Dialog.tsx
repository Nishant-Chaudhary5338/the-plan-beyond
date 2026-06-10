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
              'w-full max-w-md',
              'rounded-3xl bg-overlay p-6 shadow-[var(--shadow-overlay)] ring-1 ring-line-overlay',
              'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
              'focus:outline-none',
              className
            )}
          >
          <div className="mb-5 flex items-start justify-between gap-4">
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
          {children}
          {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
          </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
