import { useMemo } from 'react';
import { useAppSelector } from '@/app/hooks';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useGetContactsQuery } from '../api/contactsApi';
import type { ContactFilters } from '../model/filters';

/**
 * Binds the Redux filter state to the RTK Query list endpoint, debouncing the
 * search term so typing doesn't fire a request per keystroke.
 */
export function useContactsQuery() {
  const filters = useAppSelector((s) => s.contactsUi.filters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryArgs: ContactFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const result = useGetContactsQuery(queryArgs);
  const pageCount = result.data ? Math.max(1, Math.ceil(result.data.total / filters.pageSize)) : 1;

  return { ...result, filters, pageCount };
}
