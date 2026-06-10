import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { NAV_ITEMS } from './navItems';

function titleForPath(pathname: string): string {
  return NAV_ITEMS.find((i) => i.to === pathname)?.label ?? 'This area';
}

/** Branded placeholder for routes that exist in the layout but aren't built yet. */
export function WipPlaceholder() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);
  return (
    <div className="mx-auto max-w-5xl py-10">
      <h1 className="text-4xl">{title}</h1>
      <div className="panel mt-8">
        <EmptyState
          icon={Hammer}
          title="Work in progress"
          description={`${title} is part of the full product layout and is coming next. The People experience is fully built — head there to explore the build.`}
        />
      </div>
    </div>
  );
}
