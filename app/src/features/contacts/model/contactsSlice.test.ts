import { describe, it, expect } from 'vitest';
import {
  contactsReducer,
  setFilter,
  setPage,
  resetFilters,
  toggleSelected,
  clearSelected,
} from './contactsSlice';
import { DEFAULT_FILTERS } from './filters';

const initial = { filters: DEFAULT_FILTERS, selectedIds: [] };

describe('contactsSlice', () => {
  it('sets a filter and resets pagination to page 1', () => {
    const paged = contactsReducer(initial, setPage(4));
    const next = contactsReducer(paged, setFilter({ key: 'search', value: 'amit' }));
    expect(next.filters.search).toBe('amit');
    expect(next.filters.page).toBe(1);
  });

  it('does not reset page when the page itself changes', () => {
    const next = contactsReducer(initial, setFilter({ key: 'page', value: 3 }));
    expect(next.filters.page).toBe(3);
  });

  it('keeps the chosen sort when resetting filters', () => {
    const sorted = contactsReducer(initial, setFilter({ key: 'sort', value: 'recent' }));
    const withLetter = contactsReducer(sorted, setFilter({ key: 'letter', value: 'B' }));
    const reset = contactsReducer(withLetter, resetFilters());
    expect(reset.filters.letter).toBe('all');
    expect(reset.filters.sort).toBe('recent');
  });

  it('toggles and clears selection', () => {
    const one = contactsReducer(initial, toggleSelected('a'));
    expect(one.selectedIds).toEqual(['a']);
    const off = contactsReducer(one, toggleSelected('a'));
    expect(off.selectedIds).toEqual([]);
    const many = contactsReducer(contactsReducer(initial, toggleSelected('a')), toggleSelected('b'));
    expect(contactsReducer(many, clearSelected()).selectedIds).toEqual([]);
  });

  it('clears the selection whenever the visible page changes', () => {
    const selected = contactsReducer(initial, toggleSelected('a'));
    expect(contactsReducer(selected, setPage(2)).selectedIds).toEqual([]);
  });

  it('clears the selection when a filter or search changes', () => {
    const selected = contactsReducer(initial, toggleSelected('a'));
    expect(contactsReducer(selected, setFilter({ key: 'search', value: 'x' })).selectedIds).toEqual([]);
    expect(contactsReducer(selected, setFilter({ key: 'letter', value: 'B' })).selectedIds).toEqual([]);
  });

  it('clears the selection on resetFilters', () => {
    const selected = contactsReducer(initial, toggleSelected('a'));
    expect(contactsReducer(selected, resetFilters()).selectedIds).toEqual([]);
  });
});
