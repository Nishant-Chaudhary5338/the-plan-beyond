
export const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'recent', label: 'Recently added' },
  { value: 'oldest', label: 'Oldest first' },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['value'];
export type TriState = 'all' | 'on' | 'off';
/** 'all' shows every letter; otherwise a single A–Z initial. */
export type LetterFilter = 'all' | string;

export interface ContactFilters {
  search: string;
  letter: LetterFilter;
  groups: string[];
  relationship: string | null;
  beyondCircle: TriState;
  emergency: TriState;
  sort: SortKey;
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: ContactFilters = {
  search: '',
  letter: 'all',
  groups: [],
  relationship: null,
  beyondCircle: 'all',
  emergency: 'all',
  sort: 'name-asc',
  page: 1,
  pageSize: 25,
};

/** Count of filters active beyond search/sort — drives the toolbar's "clear" affordance. */
export function activeFilterCount(f: ContactFilters): number {
  let n = 0;
  if (f.letter !== 'all') n += 1;
  if (f.groups.length > 0) n += 1;
  if (f.relationship) n += 1;
  if (f.beyondCircle !== 'all') n += 1;
  if (f.emergency !== 'all') n += 1;
  return n;
}

/**
 * The single source of truth for the contacts list query string. The client
 * encodes filters into the request URL; the mock server and MSW handlers decode
 * them back. Keeping both directions here means a new filter can never be
 * silently dropped because one side forgot about it. `URLSearchParams` works in
 * the browser, Node, and jsdom, so all three transports share this codec.
 */
export function encodeFilters(f: Partial<ContactFilters>): string {
  const p = new URLSearchParams();
  if (f.search) p.set('search', f.search);
  if (f.sort) p.set('sort', f.sort);
  if (f.letter && f.letter !== 'all') p.set('letter', f.letter);
  if (f.relationship) p.set('relationship', f.relationship);
  if (f.beyondCircle && f.beyondCircle !== 'all') p.set('beyondCircle', f.beyondCircle);
  if (f.emergency && f.emergency !== 'all') p.set('emergency', f.emergency);
  f.groups?.forEach((g) => p.append('groups', g));
  if (f.page) p.set('page', String(f.page));
  if (f.pageSize) p.set('pageSize', String(f.pageSize));
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

function toInt(value: string | null, fallback: number): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function decodeFilters(params: URLSearchParams): Partial<ContactFilters> {
  return {
    search: params.get('search') ?? '',
    letter: params.get('letter') ?? 'all',
    sort: (params.get('sort') as SortKey | null) ?? 'name-asc',
    relationship: params.get('relationship') ?? null,
    beyondCircle: (params.get('beyondCircle') as TriState | null) ?? 'all',
    emergency: (params.get('emergency') as TriState | null) ?? 'all',
    groups: params.getAll('groups'),
    page: toInt(params.get('page'), 1),
    pageSize: toInt(params.get('pageSize'), 25),
  };
}
