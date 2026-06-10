import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const avatar = cva(
  'inline-grid shrink-0 place-items-center rounded-full font-medium uppercase text-content select-none',
  {
    variants: {
      size: {
        sm: 'size-9 text-xs',
        md: 'size-11 text-sm',
        lg: 'size-20 text-2xl',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

// 700/800 shades so white initials clear WCAG AA contrast (≥4.5:1).
const TINTS = [
  'bg-emerald-700',
  'bg-teal-700',
  'bg-cyan-800',
  'bg-sky-800',
  'bg-violet-700',
  'bg-amber-800',
] as const;

export interface AvatarProps extends VariantProps<typeof avatar> {
  name: string;
  imageUrl?: string | null;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last || first).slice(0, 2);
}

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length] ?? TINTS[0];
}

/** Contact avatar: photo when available, otherwise deterministic colour + initials. */
export function Avatar({ name, imageUrl, size, className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className={cn(avatar({ size }), 'object-cover', className)}
      />
    );
  }
  return (
    <span className={cn(avatar({ size }), tintFor(name), className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
