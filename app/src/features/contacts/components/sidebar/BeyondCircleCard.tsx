import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui';
import { SidebarCard } from './SidebarCard';

interface BeyondCircleCardProps {
  count: number;
  total: number;
}

/** Beyond Circle summary with a feature-enabled toggle. */
export function BeyondCircleCard({ count, total }: BeyondCircleCardProps) {
  // NOTE: this toggle is a local, non-persisted preference in this build.
  // TODO(scope): reflect `notify_circle.enabled` from the /people overview and
  // persist changes via a settings mutation once that endpoint exists.
  const [enabled, setEnabled] = useState(true);
  return (
    <SidebarCard title="Beyond Circle">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-faint">Contacts</div>
          <div className="text-3xl font-medium text-content">
            {count}
            <span className="text-base text-faint">/{total}</span>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-faint">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Enable Beyond Circle" />
        </label>
      </div>
      <button
        type="button"
        aria-label="Open Beyond Circle settings"
        className="mt-2 flex w-full items-center justify-end text-muted transition-colors hover:text-content"
      >
        <ChevronRight className="size-5" />
      </button>
    </SidebarCard>
  );
}
