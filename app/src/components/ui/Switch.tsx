import { forwardRef } from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export type SwitchProps = RadixSwitch.SwitchProps;

/** Emerald toggle matching the Beyond Circle / Emergency switches. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { className, ...props },
  ref
) {
  return (
    <RadixSwitch.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 ring-1 ring-inset ring-line transition-colors duration-200 ease-[var(--ease-out-soft)]',
        'bg-white/10 data-[state=checked]:bg-accent data-[state=checked]:ring-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-spring)] data-[state=checked]:translate-x-5" />
    </RadixSwitch.Root>
  );
});
