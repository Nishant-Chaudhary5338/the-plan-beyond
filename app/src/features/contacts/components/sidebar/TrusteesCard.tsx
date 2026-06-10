import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { SidebarCard } from './SidebarCard';
import { InviteTrusteeDialog } from './InviteTrusteeDialog';
import type { PeopleOverview } from '../../model/overview';

/** Trustees overview, driven by the live `/people` aggregate. */
export function TrusteesCard({ trustees }: { trustees: PeopleOverview['trustees'] }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const atRisk = trustees.status === 'at_risk';
  return (
    <>
    <SidebarCard
      title="Trustees"
      action={
        <Button variant="subtle" size="sm" onClick={() => setInviteOpen(true)}>
          + Invite
        </Button>
      }
    >
      <div className="flex items-end justify-between">
        <div>
          <span className="sr-only">
            {`${trustees.active_count} of ${trustees.max_allowed} trustees active`}
          </span>
          <span aria-hidden="true" className="text-3xl font-medium text-content">
            {trustees.active_count}
          </span>
          <span aria-hidden="true" className="ml-1 text-sm text-faint">
            / {trustees.max_allowed} active
          </span>
          {atRisk ? <p className="mt-1 text-xs font-medium text-warning">At risk</p> : null}
        </div>
        <div className="text-right">
          <span className="sr-only">{`${trustees.pending_count} pending requests`}</span>
          <div aria-hidden="true" className="text-2xl font-medium text-content">
            {trustees.pending_count}
          </div>
          <div aria-hidden="true" className="text-xs uppercase tracking-wide text-faint">
            Requests
          </div>
        </div>
      </div>
      <p className="mt-3 border-t border-line pt-3 text-center text-sm text-faint">
        {trustees.active_count === 0 ? 'No trustees yet' : `${trustees.active_count} active`}
      </p>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="mt-3 flex w-full items-center justify-center gap-1 text-sm text-muted transition-colors hover:text-content disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-muted"
      >
        Manage trustees <ChevronRight className="size-4" />
        <span className="sr-only">(coming soon)</span>
      </button>
    </SidebarCard>
    <InviteTrusteeDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}
