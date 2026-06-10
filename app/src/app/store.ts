import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from './baseApi';
import { contactsReducer } from '@/features/contacts/model/contactsSlice';
// Side-effect import: registers the contacts endpoints on `baseApi`. Each new
// feature adds its own `injectEndpoints` module to this list — the store config
// itself stays untouched.
import '@/features/contacts/api/contactsApi';

export function makeStore() {
  const store = configureStore({
    reducer: {
      contactsUi: contactsReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
  setupListeners(store.dispatch);
  return store;
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
