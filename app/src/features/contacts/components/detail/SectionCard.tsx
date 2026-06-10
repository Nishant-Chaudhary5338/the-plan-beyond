import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** Titled panel used by the detail page sections (Personal, Address, …). */
export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <section className={cn('panel p-5 sm:p-6', className)}>
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-faint">{title}</h2>
      {children}
    </section>
  );
}
