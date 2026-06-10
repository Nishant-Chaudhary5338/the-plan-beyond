import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS,
  MAX_PAGE_SIZE,
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

  it('clamps pageSize to a sane range and truncates fractions', () => {
    expect(decode('?pageSize=0').pageSize).toBe(1);
    expect(decode('?pageSize=999999').pageSize).toBe(MAX_PAGE_SIZE);
    expect(decode('?pageSize=-5').pageSize).toBe(1);
    expect(decode('?pageSize=10.7').pageSize).toBe(10);
  });

  it('floors page to 1 and truncates fractional pages', () => {
    expect(decode('?page=0').page).toBe(1);
    expect(decode('?page=-3').page).toBe(1);
    expect(decode('?page=2.9').page).toBe(2);
  });

  it('rejects out-of-range sort and tri-state values', () => {
    expect(decode('?sort=DROP%20TABLE').sort).toBe('name-asc');
    expect(decode('?beyondCircle=maybe').beyondCircle).toBe('all');
    expect(decode('?emergency=yes').emergency).toBe('all');
  });

  it('decode∘encode is the identity on any valid filter set', () => {
    const cases: ContactFilters[] = [
      DEFAULT_FILTERS,
      { ...DEFAULT_FILTERS, search: 'q', letter: 'Z', sort: 'oldest', page: 4, pageSize: 100 },
      { ...DEFAULT_FILTERS, groups: ['Work'], relationship: 'Friend', beyondCircle: 'off', emergency: 'on' },
    ];
    for (const f of cases) expect(decode(encodeFilters(f))).toEqual(f);
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
