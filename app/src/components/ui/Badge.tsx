import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badge = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-medium leading-none',
  {
    variants: {
      variant: {
        accent: 'bg-accent/15 text-accent-bright ring-1 ring-accent/30',
        // text-content (not text-muted): bg-white/8 lightens the surface beneath
        // the badge, so muted text drops under AA 4.5:1 on raised cards.
        neutral: 'bg-white/8 text-content ring-1 ring-line',
        outline: 'text-identifier ring-1 ring-identifier/40',
        warning: 'bg-warning/15 text-warning ring-1 ring-warning/30',
      },
      size: {
        sm: 'px-2 py-0.5',
        md: 'px-2.5 py-1',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badge({ variant, size }), className)} {...props} />;
}
