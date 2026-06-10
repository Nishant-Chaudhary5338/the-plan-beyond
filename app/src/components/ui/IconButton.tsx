import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const iconButton = cva(
  'inline-grid place-items-center rounded-full text-muted transition-[color,background-color,transform] duration-150 hover:text-content active:scale-90 disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        ghost: 'hover:bg-white/8',
        solid: 'bg-white/8 ring-1 ring-line hover:bg-white/12',
        danger: 'hover:bg-danger/15 hover:text-danger',
      },
      size: {
        sm: 'size-8',
        md: 'size-10',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButton> {
  /** Required for screen readers — icon buttons have no visible text. */
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(iconButton({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );
});
