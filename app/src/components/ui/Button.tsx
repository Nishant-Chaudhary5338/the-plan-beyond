import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

const button = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,transform,box-shadow] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent hover:bg-accent-hover',
        subtle: 'bg-white/8 text-content ring-1 ring-line hover:bg-white/12',
        secondary: 'bg-surface-raised text-content ring-1 ring-line hover:bg-surface-hover',
        ghost: 'text-muted hover:bg-white/6 hover:text-content',
        outline: 'text-content ring-1 ring-line-strong hover:bg-white/6',
        danger: 'bg-danger-surface text-danger ring-1 ring-danger-line hover:bg-danger/15',
        solid: 'bg-content text-canvas-deep hover:bg-content/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, isLoading = false, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
});
