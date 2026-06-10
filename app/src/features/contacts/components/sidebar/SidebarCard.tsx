import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SidebarCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Shared frame for the People sidebar stat cards. */
export function SidebarCard({ title, action, children, className }: SidebarCardProps) {
  return (
    <section className={cn('panel p-4', className)}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <span className="sr-only">{`${value} ${label}`}</span>
      <div aria-hidden="true" className="text-2xl font-medium text-content">
        {value}
      </div>
      <div aria-hidden="true" className="text-xs uppercase tracking-wide text-faint">
        {label}
      </div>
    </div>
  );
}
