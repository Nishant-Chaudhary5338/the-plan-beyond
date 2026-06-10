import { z } from 'zod';

/**
 * Wire shapes for the live `/people` aggregate. Drives the sidebar cards and
 * header counts only; the contacts list itself is paginated/filtered via
 * `/contacts`. We parse just the summary counts the UI actually reads.
 */

const trusteeStatus = z.enum(['active', 'at_risk', 'ok']).catch('at_risk');

export const peopleOverviewSchema = z.object({
  contacts: z.object({ total: z.number() }),
  trustees: z.object({
    active_count: z.number(),
    pending_count: z.number().default(0),
    pending_received_count: z.number().default(0),
    max_allowed: z.number(),
    status: trusteeStatus,
  }),
  keyholders: z.object({
    accepted_count: z.number().default(0),
    confirmed_event_count: z.number().default(0),
    total_event_count: z.number().default(0),
    pending_count: z.number().default(0),
  }),
  notify_circle: z.object({
    enabled: z.boolean(),
    mode: z.string(),
    total_recipients: z.number(),
  }),
  /** The A–Z initials that currently have at least one contact (for rail dimming). */
  available_letters: z.array(z.string()).default([]),
});

/** Request envelope for `POST /trustees/invite` — validated at the service edge. */
export const inviteTrusteeRequestSchema = z.object({ contact_id: z.string() });

export const trusteeInviteSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  contact_id: z.string(),
  status: z.string(),
  invited_at: z.string(),
  accepted_at: z.string().nullable().default(null),
  contact_name: z.string(),
  contact_email: z.string().nullable().default(null),
  contact_phone: z.string().nullable().default(null),
});

export type PeopleOverview = z.infer<typeof peopleOverviewSchema>;
export type TrusteeInvite = z.infer<typeof trusteeInviteSchema>;

export interface ReadinessStep {
  label: string;
  done: boolean;
}

export interface PlanReadiness {
  /** 0–100, rounded. */
  pct: number;
  steps: ReadinessStep[];
  complete: boolean;
  /** The first not-yet-done step, if any — the gentle nudge to surface. */
  nextStep: ReadinessStep | null;
}

/**
 * Honest plan-readiness derived only from real `/people` signals — no invented
 * metric. Three concrete steps a person can actually complete and verify (A-P2.8).
 */
export function planReadiness(o: PeopleOverview): PlanReadiness {
  const steps: ReadinessStep[] = [
    { label: 'Add the people who matter', done: o.contacts.total > 0 },
    { label: 'Name a trustee to act for you', done: o.trustees.active_count > 0 },
    {
      label: 'Set up your Beyond Circle',
      done: o.notify_circle.total_recipients > 0 || o.keyholders.accepted_count > 0,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return {
    pct: Math.round((done / steps.length) * 100),
    steps,
    complete: done === steps.length,
    nextStep: steps.find((s) => !s.done) ?? null,
  };
}
