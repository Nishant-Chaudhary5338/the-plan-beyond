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
});

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
