import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  encodeFilters,
  decodeFilters,
  type ContactFilters,
} from './filters';

const decode = (qs: string) => decodeFilters(new URLSearchParams(qs.replace(/^\?/, '')));

describe('filter codec', () => {
  it('omits defaults/empties from the query string', () => {
    expect(encodeFilters(DEFAULT_FILTERS)).toBe('?sort=name-asc&page=1&pageSize=25');
  });

  it('round-trips a fully-populated filter set', () => {
    const filters: ContactFilters = {
      search: 'ada',
      letter: 'A',
      groups: ['Family', 'Work'],
      relationship: 'Sibling',
      beyondCircle: 'on',
      emergency: 'off',
      sort: 'recent',
      page: 3,
      pageSize: 50,
    };
    expect(decode(encodeFilters(filters))).toEqual(filters);
  });

  it('encodes multi-valued groups as repeated params', () => {
    expect(encodeFilters({ groups: ['Family', 'Work'] })).toBe('?groups=Family&groups=Work');
    expect(decode('?groups=Family&groups=Work').groups).toEqual(['Family', 'Work']);
  });

  it('falls back to defaults for missing/garbage params', () => {
    const f = decode('?page=nope');
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(25);
    expect(f.sort).toBe('name-asc');
    expect(f.beyondCircle).toBe('all');
    expect(f.groups).toEqual([]);
  });

  it('drops the leading "?" only when params exist', () => {
    expect(encodeFilters({})).toBe('');
  });
});

describe('activeFilterCount', () => {
  it('ignores search and sort', () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, search: 'x', sort: 'recent' })).toBe(0);
  });

  it('counts each non-default refinement once', () => {
    expect(
      activeFilterCount({
        ...DEFAULT_FILTERS,
        letter: 'A',
        groups: ['Family'],
        relationship: 'Sibling',
        beyondCircle: 'on',
        emergency: 'off',
      })
    ).toBe(5);
  });
});
