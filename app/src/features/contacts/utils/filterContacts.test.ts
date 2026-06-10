import { describe, it, expect } from 'vitest';
import { filterContacts, displayName, indexLetter } from './filterContacts';
import { makeSeedContacts } from '../mocks/seed';

const all = makeSeedContacts();

describe('filterContacts', () => {
  it('returns everything (paged) with no filters', () => {
    const { items, total } = filterContacts(all, { pageSize: 100 });
    expect(total).toBe(all.length);
    expect(items).toHaveLength(all.length);
  });

  it('searches across name, phone, and company', () => {
    expect(filterContacts(all, { search: 'Amit' }).total).toBe(1);
    expect(filterContacts(all, { search: '9867239020' }).total).toBe(1);
    expect(filterContacts(all, { search: 'Northwind' }).total).toBe(1);
  });

  it('filters by leading letter', () => {
    const res = filterContacts(all, { letter: 'A', pageSize: 100 });
    expect(res.items.every((c) => indexLetter(c) === 'A')).toBe(true);
    expect(res.total).toBeGreaterThan(0);
  });

  it('filters by Beyond Circle tri-state', () => {
    const on = filterContacts(all, { beyondCircle: 'on', pageSize: 100 });
    const off = filterContacts(all, { beyondCircle: 'off', pageSize: 100 });
    expect(on.items.every((c) => c.isBeyondCircle)).toBe(true);
    expect(off.items.every((c) => !c.isBeyondCircle)).toBe(true);
    expect(on.total + off.total).toBe(all.length);
  });

  it('sorts by name ascending and descending', () => {
    const asc = filterContacts(all, { sort: 'name-asc', pageSize: 100 }).items.map(displayName);
    const desc = filterContacts(all, { sort: 'name-desc', pageSize: 100 }).items.map(displayName);
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
    expect(desc).toEqual([...asc].reverse());
  });

  it('paginates without losing the total', () => {
    const page1 = filterContacts(all, { page: 1, pageSize: 10 });
    const page2 = filterContacts(all, { page: 2, pageSize: 10 });
    expect(page1.items).toHaveLength(10);
    expect(page1.total).toBe(all.length);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });
});
