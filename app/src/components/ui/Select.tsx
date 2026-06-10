import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  className?: string;
}

/** Styled, keyboard-accessible single-select (Title, Sort, etc.). */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, onValueChange, options, placeholder = 'Select…', className, ...aria },
  ref
) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        ref={ref}
        {...aria}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-field)] bg-white/5 px-3.5 text-sm text-content ring-1 ring-inset ring-line transition-colors hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="size-4 text-faint" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl bg-overlay p-1.5 shadow-[var(--shadow-overlay)] ring-1 ring-line-overlay data-[state=open]:animate-pop-in"
        >
          <RadixSelect.Viewport className="scroll-themed">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
});

function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixSelect.Item
      value={value}
      className="relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm text-content outline-none data-[highlighted]:bg-white/8 data-[state=checked]:text-emerald-400"
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="absolute right-2.5">
        <Check className="size-4" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
