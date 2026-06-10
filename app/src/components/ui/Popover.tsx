import type { ReactNode } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: RadixPopover.PopoverContentProps['align'];
  className?: string;
}

/** Floating panel for filter menus, the country picker, and sort menus. */
export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  className,
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            'z-50 min-w-[12rem] rounded-2xl bg-overlay p-1.5 text-sm text-content shadow-[var(--shadow-overlay)] ring-1 ring-line-overlay',
            'data-[state=open]:animate-pop-in focus:outline-none',
            className
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
