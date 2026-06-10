import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_FILTERS, type ContactFilters } from './filters';

interface ContactsUiState {
  filters: ContactFilters;
  /** Row ids currently selected via checkboxes. */
  selectedIds: string[];
}

const initialState: ContactsUiState = {
  filters: DEFAULT_FILTERS,
  selectedIds: [],
};

/**
 * UI-only state for the contacts feature. Server data lives in RTK Query;
 * this slice owns search/filter/sort/selection so the URL-free UI stays snappy.
 * Mutating any filter resets pagination to page 1.
 */
const contactsSlice = createSlice({
  name: 'contactsUi',
  initialState,
  reducers: {
    setFilter<K extends keyof ContactFilters>(
      state: ContactsUiState,
      action: PayloadAction<{ key: K; value: ContactFilters[K] }>
    ) {
      const { key, value } = action.payload;
      state.filters[key] = value;
      if (key !== 'page') state.filters.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.filters.page = Math.max(1, action.payload);
    },
    resetFilters(state) {
      state.filters = { ...DEFAULT_FILTERS, sort: state.filters.sort };
    },
    toggleSelected(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
    },
    setSelectedMany(state, action: PayloadAction<string[]>) {
      state.selectedIds = action.payload;
    },
    clearSelected(state) {
      state.selectedIds = [];
    },
  },
});

export const {
  setFilter,
  setPage,
  resetFilters,
  toggleSelected,
  setSelectedMany,
  clearSelected,
} = contactsSlice.actions;
export const contactsReducer = contactsSlice.reducer;
