import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Centered empty / zero-data state (No people yet, WIP routes, empty search). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className
      )}
    >
      <div className="grid size-16 place-items-center rounded-full bg-white/6 text-muted ring-1 ring-line">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold uppercase tracking-wide text-content">{title}</h2>
        {description ? (
          <p className="mx-auto max-w-sm text-pretty text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
