import { useGetPeopleOverviewQuery } from '../api/contactsApi';
import type { PeopleOverview } from '../model/overview';
import { TRUSTEE_LIMIT } from '../model/constants';

const FALLBACK: PeopleOverview = {
  contacts: { total: 0 },
  trustees: { active_count: 0, pending_count: 0, pending_received_count: 0, max_allowed: TRUSTEE_LIMIT, status: 'at_risk' },
  keyholders: { accepted_count: 0, confirmed_event_count: 0, total_event_count: 0, pending_count: 0 },
  notify_circle: { enabled: true, mode: 'all', total_recipients: 0 },
  available_letters: [],
};

/** Reads the live `/people` aggregate for the header counts and sidebar cards. */
export function useContactsStats(): PeopleOverview & { isLoading: boolean } {
  const { data, isLoading } = useGetPeopleOverviewQuery();
  return { ...(data ?? FALLBACK), isLoading };
}
