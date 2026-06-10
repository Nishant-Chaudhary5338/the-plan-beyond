import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Shimmer placeholder used while data loads (prevents layout shift). */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-white/8', className)}
      {...props}
    />
  );
}
