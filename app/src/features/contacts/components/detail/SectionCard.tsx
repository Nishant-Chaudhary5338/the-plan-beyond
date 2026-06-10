import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** Render the section as collapsible with a toggle header. */
  collapsible?: boolean;
  /** Start collapsed (only meaningful with `collapsible`). */
  defaultCollapsed?: boolean;
}

/** Titled panel used by the detail page sections (Personal, Address, …). */
export function SectionCard({ title, children, className, collapsible, defaultCollapsed }: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(collapsible ? Boolean(defaultCollapsed) : false);
  const heading = <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">{title}</h2>;

  return (
    <section className={cn('panel p-5 sm:p-6', className)}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'flex w-full items-center justify-between rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            !collapsed && 'mb-5'
          )}
        >
          {heading}
          <ChevronDown
            className={cn('size-4 text-faint transition-transform', collapsed && '-rotate-90')}
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="mb-5">{heading}</div>
      )}
      {!collapsed ? children : null}
    </section>
  );
}
