import type { Contact } from '../model/types';
import type { ContactFilters, SortKey } from '../model/filters';

/** Full display name used for search + sorting. */
export function displayName(c: Contact): string {
  return [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ');
}

// Latin letters whose diacritic is a stroke/ligature and so survive NFD folding.
const LATIN_FOLD: Record<string, string> = {
  Ł: 'L', Ø: 'O', Đ: 'D', Ð: 'D', Þ: 'T', Ħ: 'H', Ŧ: 'T', Ƀ: 'B',
};

/**
 * The leading A–Z letter a contact is indexed under ('#' for non-alpha).
 * Accented Latin initials are folded to their base letter (e.g. "Émile" → "E",
 * "José" → "J", "Łukasz" → "L") so they bucket correctly; non-Latin scripts
 * fall under '#'.
 */
export function indexLetter(c: Contact): string {
  const upper = c.firstName.trim().charAt(0).toUpperCase();
  if (!upper) return '#';
  const folded = upper.normalize('NFD').replace(/\p{Diacritic}/gu, '').charAt(0);
  if (/^[A-Z]$/.test(folded)) return folded;
  return LATIN_FOLD[upper] ?? '#';
}

function matchesSearch(c: Contact, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    displayName(c),
    ...c.phones.flatMap((p) => [p.e164, p.number]),
    ...c.emails.map((e) => e.email),
    c.professional.company,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function matchesTriState(value: boolean, state: 'all' | 'on' | 'off'): boolean {
  if (state === 'all') return true;
  return state === 'on' ? value : !value;
}

function comparator(sort: SortKey): (a: Contact, b: Contact) => number {
  switch (sort) {
    case 'name-desc':
      return (a, b) => displayName(b).localeCompare(displayName(a));
    case 'recent':
      return (a, b) => b.createdAt.localeCompare(a.createdAt);
    case 'oldest':
      return (a, b) => a.createdAt.localeCompare(b.createdAt);
    case 'name-asc':
    default:
      return (a, b) => displayName(a).localeCompare(displayName(b));
  }
}

export interface FilterResult {
  items: Contact[];
  total: number;
}

/**
 * Pure filter → sort → paginate pipeline. Shared by the Express mock and MSW
 * so dev, tests, and e2e all agree on behaviour.
 */
export function filterContacts(all: Contact[], f: Partial<ContactFilters>): FilterResult {
  const filtered = all.filter((c) => {
    if (!matchesSearch(c, f.search ?? '')) return false;
    if (f.letter && f.letter !== 'all' && indexLetter(c) !== f.letter) return false;
    if (f.relationship && c.relationship !== f.relationship) return false;
    if (f.groups?.length && !f.groups.some((g) => c.groups.includes(g))) return false;
    if (!matchesTriState(c.isBeyondCircle, f.beyondCircle ?? 'all')) return false;
    if (!matchesTriState(c.isEmergencyContact, f.emergency ?? 'all')) return false;
    return true;
  });

  filtered.sort(comparator(f.sort ?? 'name-asc'));

  const total = filtered.length;
  const page = Math.max(1, Math.trunc(f.page ?? 1));
  const pageSize = Math.max(1, Math.trunc(f.pageSize ?? 25));
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), total };
}
