import { Check, Circle } from 'lucide-react';
import { Popover } from '@/components/ui';
import { planReadiness } from '../../model/overview';
import type { PeopleOverview } from '../../model/overview';

interface PlanReadinessProps {
  overview: PeopleOverview;
}

/**
 * A quiet "your plan is X% ready" affordance (A-P2.8). Warm and finishable —
 * it names the next concrete step rather than alarming. Click to see all steps.
 */
export function PlanReadiness({ overview }: PlanReadinessProps) {
  const readiness = planReadiness(overview);
  const label = readiness.complete
    ? 'Your plan is ready'
    : `Your plan is ${readiness.pct}% ready`;

  return (
    <Popover
      align="start"
      trigger={
        <button
          type="button"
          className="group mt-3 flex max-w-xs items-center gap-3 rounded-full bg-white/[0.05] px-3 py-1.5 text-left ring-1 ring-inset ring-line transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${label}. View setup steps.`}
        >
          <span
            className="relative h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/[0.08]"
            aria-hidden="true"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${readiness.pct}%` }}
            />
          </span>
          <span className="truncate text-xs font-medium text-content">{label}</span>
        </button>
      }
    >
      <div className="w-64 p-1">
        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-faint">
          {readiness.complete ? 'All set' : 'A few steps to go'}
        </p>
        <ul className="py-1">
          {readiness.steps.map((step) => (
            <li
              key={step.label}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm"
            >
              {step.done ? (
                <Check className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                <Circle className="size-4 shrink-0 text-faint" aria-hidden="true" />
              )}
              <span className={step.done ? 'text-muted line-through' : 'text-content'}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Popover>
  );
}
