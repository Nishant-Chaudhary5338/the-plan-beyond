import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badge = cva(
  'inline-flex items-center gap-1 rounded-full text-xs font-medium leading-none',
  {
    variants: {
      variant: {
        accent: 'bg-accent/15 text-emerald-400 ring-1 ring-accent/30',
        neutral: 'bg-white/8 text-muted ring-1 ring-line',
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
