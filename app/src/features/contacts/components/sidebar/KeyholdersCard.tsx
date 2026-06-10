import { ChevronRight } from 'lucide-react';
import { InfoPopover } from '@/components/ui';
import { SidebarCard, Stat } from './SidebarCard';
import { ROLE_DEFINITIONS } from '../../model/microcopy';
import type { PeopleOverview } from '../../model/overview';

/** Keyholders overview, driven by the live `/people` aggregate. */
export function KeyholdersCard({ keyholders }: { keyholders: PeopleOverview['keyholders'] }) {
  return (
    <SidebarCard
      title="Keyholders"
      info={
        <InfoPopover
          label="Keyholders"
          definition={ROLE_DEFINITIONS.keyholder.definition}
          example={ROLE_DEFINITIONS.keyholder.example}
        />
      }
    >
      <div className="flex items-center justify-between">
        <Stat value={keyholders.accepted_count} label="Active" />
        <Stat value={keyholders.confirmed_event_count} label="Events" />
        <Stat value={keyholders.pending_count} label="Requests" />
      </div>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="mt-3 flex w-full items-center justify-center gap-1 border-t border-line pt-3 text-sm text-muted transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-muted"
      >
        Manage keyholders <ChevronRight className="size-4" />
        <span className="sr-only">(coming soon)</span>
      </button>
    </SidebarCard>
  );
}
