import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button, InfoPopover } from '@/components/ui';
import { SidebarCard } from './SidebarCard';
import { StatusLine } from './StatusLine';
import { InviteTrusteeDialog } from './InviteTrusteeDialog';
import { ROLE_DEFINITIONS } from '../../model/microcopy';
import type { PeopleOverview } from '../../model/overview';

/** Trustees overview, driven by the live `/people` aggregate. */
export function TrusteesCard({ trustees }: { trustees: PeopleOverview['trustees'] }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const atRisk = trustees.status === 'at_risk';
  const active = trustees.active_count;
  // Warm, finishable status — color is a quiet signal, copy reassures (brief A1).
  const status =
    active === 0
      ? { tone: 'attention' as const, text: 'No trustees yet · Add one to activate your plan' }
      : atRisk
        ? { tone: 'attention' as const, text: `${active} active · Add another to finish setting up` }
        : { tone: 'ok' as const, text: `${active} active · You’re all set` };
  return (
    <>
    <SidebarCard
      title="Trustees"
      info={
        <InfoPopover
          label="Trustees"
          definition={ROLE_DEFINITIONS.trustee.definition}
          example={ROLE_DEFINITIONS.trustee.example}
        />
      }
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
      <div className="mt-3 border-t border-line pt-3">
        <StatusLine tone={status.tone} text={status.text} />
      </div>
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
