# Architecture

## Principles

- **Feature-first.** Everything about contacts lives under `src/features/contacts`. The rest of `src` is generic infrastructure (design system, layout, store wiring, lib).
- **One boundary for data.** Server state goes through a single RTK Query API (`app/baseApi`); each feature injects its endpoints via `injectEndpoints`. UI-only state (filters, selection) lives in a slice. They never mix.
- **Validate at the edges.** Zod parses every API response, the create form, env-shaped input, and parsed VCF — so untyped data never flows inward.
- **Small units.** Components ≤ 300 lines, functions/hooks ≤ 50, one component per file, co-located tests.

## Layout

```
server/                     Express mock API (own tsconfig, run via tsx)
src/
  app/                      store, baseApi, typed hooks, router, providers
  components/
    ui/                     design system (Button, Dialog, Select, PhoneInput, …)
    layout/                 AppShell, SideNav, TopBar, WipPlaceholder, ErrorBoundary
  features/contacts/
    api/                    contactsApi (endpoints injected into baseApi), contactsService (shared CRUD), apiError
    model/                  types + Zod schemas, filters, slice, wire mappers, overview, constants
    mocks/                  demo data that stands in for the real backend (seed DB, Google sync, address autofill)
    components/{list,detail,add,import,sidebar}/
    hooks/                  useContactsQuery, useContactDraft, useContactsStats
    pages/                  ContactsListPage, ContactDetailPage
    utils/                  filterContacts, alphabet, vcfParser
  lib/                      cn, phone, countries, format, useDebouncedValue
  test/                     setup, MSW handlers/server, renderWithProviders, fixtures
e2e/                        Playwright specs (contacts, add-contact, a11y)
```

## Data flow

```
Component → RTK Query hook → fetchBaseQuery(/api) → [dev] Vite proxy → Express
                                                  → [test] MSW intercept
         ← Zod-validated response ← transformResponse ←
UI state (search/filters/sort/selection) → contactsSlice → useContactsQuery composes the request
```

- **List** reads filters from the slice, debounces search, and calls `getContacts`. Mutations invalidate the `ContactList` tag to refetch.
- **Detail** loads into `useContactDraft`, which diffs the draft against the server copy for dirty-tracking; `updateContact` applies an optimistic cache patch and rolls back on error.

## Server / MSW parity

The Express mock and the MSW test handlers both call **one** `createContactsService`
(`features/contacts/api/contactsService.ts`) — the same filtering, validation, and
dedup logic. Dev, unit/integration tests, and e2e therefore behave identically, and
the seed dataset is deterministic (`mocks/seed.ts`). All demo stand-ins for the
real backend (`seed`, `googleMockContacts`, `addressSuggestions`) live under
`features/contacts/mocks/`, so what's fake-for-the-demo is obvious at a glance.

## App shell

`AppShell` renders the persistent nav rail + top bar around a routed `<Outlet/>`.
Routes are lazy-loaded and code-split; non-People routes render `WipPlaceholder`.
A top-level `ErrorBoundary` keeps a render crash from taking down the chrome.
