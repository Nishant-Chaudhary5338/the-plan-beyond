import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Same-origin "/api" by default; override with `VITE_API_BASE_URL` to point at a
 * real backend. Resolved to an absolute URL because jsdom (tests) needs the
 * origin for node's fetch to parse the request.
 */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined;
  return origin && origin.startsWith('http') ? `${origin}/api` : '/api';
}

/**
 * The one RTK Query API for the whole app. Features add their endpoints via
 * `baseApi.injectEndpoints(...)` instead of creating their own `createApi`, so
 * the base URL, headers, and cache tags stay in a single place and the store
 * never has to learn about each feature's reducer. Register new cache tags here.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: resolveApiBase() }),
  tagTypes: ['Contact', 'ContactList'],
  endpoints: () => ({}),
});
