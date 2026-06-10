# The Plan Beyond

**The Plan Beyond** is the product; **My People** is the feature implemented here to production
depth — a relationship hub for managing trusted people, trustees, keyholders, and your "Beyond Circle".

Built as a **standalone, self-contained app**: clone, install, run. No monorepo, no private
packages, no backend to stand up — a deterministic Express mock API ships in-repo and is shared,
byte-for-byte, with the test suite.

![React](https://img.shields.io/badge/React-19-149eca) ![Vite](https://img.shields.io/badge/Vite-7-646cff) ![TS](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Tests](https://img.shields.io/badge/tests-90%20passing-success) ![Lighthouse](https://img.shields.io/badge/Lighthouse-100%2F100%2F100-success)

---

## Contents

- [Quickstart](#quickstart)
- [Scripts](#scripts)
- [What's built](#whats-built)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [The data layer](#the-data-layer)
- [State management](#state-management)
- [Design system](#design-system)
- [Testing](#testing)
- [Accessibility](#accessibility)
- [Configuration](#configuration)
- [Conventions](#conventions)
- [How to extend](#how-to-extend)
- [Further docs](#further-docs)

---

## Quickstart

**Requirements:** Node `>=20.19`, and [pnpm](https://pnpm.io) (npm works too).

```bash
pnpm install
pnpm dev          # web on :5173, mock API on :3001 (proxied at /api)
```

Open <http://localhost:5173/contacts>.

`pnpm dev` runs Vite and the Express mock API together (via `concurrently`). The Vite dev server
proxies `/api` → `http://localhost:3001`, so the app talks to a same-origin `/api` in every
environment.

> **First e2e run only:** `npx playwright install chromium`.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite + Express mock API together |
| `pnpm web` / `pnpm server` | Run just the web app / just the mock API |
| `pnpm build` | Type-check (`tsc -b`) + production Vite build |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Unit + integration (Vitest + Testing Library + MSW) |
| `pnpm test:watch` | …in watch mode |
| `pnpm test:cov` | …with V8 coverage + thresholds |
| `pnpm e2e` | End-to-end + accessibility (Playwright + axe) |
| `pnpm e2e:ui` | Playwright UI mode |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | `tsc -b --noEmit` |
| `pnpm format` | Prettier write |
| **`pnpm ci`** | **lint → typecheck → test:cov → build** (the full gate) |

`ci` runs **`test:cov`**, so the coverage thresholds (below) are enforced on every CI run — they
can't silently regress. A Husky `pre-commit` hook runs `lint-staged` (ESLint + Prettier on staged files).

---

## What's built

- **My People list** — contacts table with select-all + per-row delete, **debounced** search, A–Z
  index, sort, segment filters (groups / Beyond Circle / emergency / relationship), pagination, and
  distinct empty/error/loading states. The whole page fits one viewport; only the table scrolls.
- **Add Contact** — modal with a searchable country-code phone picker (`libphonenumber-js`), client
  **and** server validation, dedupe on E.164, and an inline server-error banner.
- **Contact detail / edit** — phones (set identifier, add/remove), emails, personal info, address
  (mock autofill + copy-from-contact), professional, notes, emergency / Beyond-Circle toggles,
  relationship & groups — with a floating **unsaved-changes bar** (dirty-tracking via draft diff,
  optimistic save with rollback).
- **Trustees / Keyholders / Beyond Circle** sidebar cards driven by a `/people` aggregate, plus an
  **Invite trustee** flow.
- **Import** — VCF file parsing (fully implemented) and a mocked Google sync, in a three-section
  modal (Source → New → Current) that mirrors the live app, including search + delete of existing contacts.
- **App shell** — persistent, **collapsible** nav rail (icons ↔ labels, remembered across sessions)
  + top bar; non-People routes render a branded "Work in progress" placeholder; a top-level error
  boundary keeps a render crash from taking down the chrome.

Fully responsive · **WCAG 2.1 AA** (axe-clean) · **Lighthouse 100** for Accessibility / Best Practices / SEO.

---

## Tech stack

| Concern | Choice |
|---|---|
| UI | **React 19**, **React Router 7** (lazy, code-split routes) |
| Build/dev | **Vite 7**, **TypeScript** (strict, `noUncheckedIndexedAccess`) |
| Styling | **Tailwind v4** (CSS-first design tokens in `@theme`) |
| Server state | **Redux Toolkit + RTK Query** (single `baseApi`, feature-injected endpoints) |
| UI state | a thin **Redux slice** (filters / selection) |
| Forms | **React Hook Form + Zod** |
| Primitives | **Radix UI** (Dialog, Popover, Select, Switch, Tooltip) + **Motion**, **Sonner** |
| Validation | **Zod** at every boundary (API responses, forms, env, parsed VCF) |
| Mock API | **Express** (dev) + **MSW** (tests) sharing one service |
| Tests | **Vitest**, **Testing Library**, **MSW**, **Playwright + axe** |

---

## Architecture

Four principles, enforced by the layout and the type system:

1. **Feature-first.** Everything about contacts lives under `src/features/contacts`. The rest of
   `src` is generic infrastructure (design system, layout, store wiring, `lib`).
2. **One boundary for data.** Server state flows through a **single** RTK Query API (`app/baseApi`);
   each feature *injects* its endpoints. UI-only state (filters, selection) lives in a slice. They
   never mix.
3. **Validate at the edges.** Zod parses every API response, the create form, env-shaped input, and
   parsed VCF — so untyped data never flows inward. A camelCase internal model is kept clean behind
   an **anti-corruption layer** (`model/wire.ts`) that maps to/from the snake_case wire shapes.
4. **Small units.** Components ≤ 300 lines, functions/hooks ≤ 50, one component per file, co-located tests.

### Data flow

```
Component → RTK Query hook → fetchBaseQuery(/api) → [dev]  Vite proxy → Express
                                                  → [test] MSW intercept
         ← Zod-validated response ← transformResponse ←
UI state (search / filters / sort / selection) → contactsSlice → useContactsQuery composes the request
```

- **List** reads filters from the slice, debounces search, and calls `getContacts`. Mutations
  invalidate the `ContactList` cache tag to refetch.
- **Detail** loads into `useContactDraft`, which diffs the draft against the server copy for
  dirty-tracking; `updateContact` applies an optimistic cache patch and rolls back on error.

### Server / MSW parity

The Express mock and the MSW test handlers both call **one** `createContactsService`
(`features/contacts/api/contactsService.ts`) — identical filtering, validation, and dedup logic.
Dev, unit/integration tests, and e2e therefore behave identically, and the seed dataset is
deterministic (`mocks/seed.ts`). The list query string has a **single codec**
(`encodeFilters` / `decodeFilters` in `model/filters.ts`) used by the client, the Express server,
and the MSW handlers — so a new filter can't be silently dropped by one side.

---

## Project structure

```
server/
  index.ts                  Express mock API (own tsconfig, run via tsx)

src/
  app/                      composition root
    baseApi.ts              the ONE RTK Query API; features inject endpoints here
    store.ts                configureStore; features register via side-effect import
    hooks.ts                pre-typed useAppDispatch / useAppSelector / useAppStore
    routes.tsx              lazy, code-split routes
    providers.tsx           Redux + ErrorBoundary + Tooltip + Toaster

  components/
    ui/                     design system primitives (Button, Dialog, Select, PhoneInput, …) + barrel
    layout/                 AppShell, SideNav (collapsible), TopBar, WipPlaceholder, ErrorBoundary

  features/contacts/
    api/                    contactsApi (injected endpoints), contactsService (shared CRUD), apiError
    model/                  types + Zod schemas, filters (+ query codec), slice, wire mappers,
                            overview schema, constants
    mocks/                  demo data standing in for the real backend:
                              seed.ts (the in-memory "DB"), googleMockContacts.ts, addressSuggestions.ts
    components/
      list/                 panel, table, row, pagination, alphabet index, segment filters, sort, header
      detail/               header, info card, sections (personal/address/professional/roles/notes),
                            unsaved-changes bar, section card
      add/                  AddContactDialog
      import/               ImportDialog, ImportReview
      sidebar/              People sidebar + Trustees / Keyholders / BeyondCircle cards, Invite dialog
    hooks/                  useContactsQuery, useContactDraft, useContactsStats
    pages/                  ContactsListPage, ContactDetailPage

  lib/                      framework-agnostic helpers: cn, phone, countries, format, id, useDebouncedValue
  test/                     setup, MSW handlers/server, renderWithProviders

e2e/                        Playwright specs (contacts, add-contact, a11y)
docs/                       ARCHITECTURE · API · DESIGN-SYSTEM · TESTING · DECISIONS · ENGINEERING-NOTES
```

Import alias: `@/` → `src/`. (The Express server and a few files it imports use relative paths
instead, because they run under `tsx`/Node, outside Vite's alias resolution.)

---

## The data layer

This is the part to swap when wiring a real backend; it's deliberately one folder + the schemas.

- **`app/baseApi.ts`** — the single `createApi`. Owns the base URL, `fetchBaseQuery`, and cache tags.
  Resolves the base URL from `VITE_API_BASE_URL`, falling back to same-origin `/api`.
- **`features/contacts/api/contactsApi.ts`** — `baseApi.injectEndpoints({...})`. Defines the
  contacts endpoints and exports the generated hooks. **Adding a feature touches zero shared files** —
  it injects its own endpoints and is registered in the store by a side-effect import.
- **`model/types.ts`** — Zod schemas + inferred types for the clean **internal** model.
- **`model/wire.ts`** — the anti-corruption layer: `fromWire*` / `toWire*` mappers between the
  snake_case live-API shapes and the internal camelCase model. Mapping happens **only** at the boundary.
- **`api/contactsService.ts`** — the in-memory service (filter / validate / dedup) shared by Express
  and MSW, so all environments agree.

Every response is parsed by Zod in `transformResponse`, so a malformed payload fails loudly at the
edge instead of corrupting state downstream.

---

## State management

Two non-overlapping stores of truth:

- **Server state → RTK Query** (the `api` reducer). Caching, refetching, optimistic updates, and
  invalidation all live here.
- **UI state → `contactsSlice`** (`contactsUi`): search term, segment filters, sort, letter, page,
  and row selection. `useContactsQuery` composes the slice's filters (debouncing search) into the
  RTK Query request; `useContactDraft` owns the editable draft + dirty-tracking on the detail page.

---

## Design system

Tokens are **CSS-first** (Tailwind v4 `@theme` in `src/index.css`) — semantic colors, radii,
shadows, motion easings. Components consume only semantic tokens (`bg-surface`, `text-muted`, …),
never raw hex. Primitives in `components/ui` wrap Radix where behavior/accessibility matters
(Dialog, Popover, Select, Switch, Tooltip) and add the project's styling + motion. See
[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

---

## Testing

A standard pyramid — **90 unit/integration tests across 20 files**, plus 3 Playwright e2e specs:

- **Unit** — pure logic: filter codec, `filterContacts`, `wire` mappers, the slice, `vcfParser`.
- **Integration** — components against the **real** service via MSW (`renderWithProviders` wires
  Redux + Router + Tooltip + a pre-bound `userEvent`). Covers the list, detail edit flow, dialogs,
  filters, sidebar, and nav.
- **E2E + a11y** — Playwright drives the full app (Express mock booted by the test runner); the a11y
  spec asserts **zero axe violations**.

```bash
pnpm test            # unit + integration
pnpm test:cov        # + coverage (enforced thresholds)
pnpm e2e             # end-to-end + accessibility
```

**Coverage gate.** `vitest.config.ts` enforces `src/features/contacts/**` ≥ **80%**
statements/functions/lines and ≥ 75% branches; `pnpm ci` runs `test:cov`, so it's enforced on every
run. Overall coverage is ~93% statements. See [docs/TESTING.md](docs/TESTING.md).

> Tests earn their keep: the integration suite caught a real bug where the segment-filter popovers
> never opened (a trigger component dropped Radix's injected `onClick`/`ref`).

---

## Accessibility

WCAG 2.1 AA, verified by axe in e2e and Lighthouse (100). Throughout: focus-visible rings, focus
trapping + scroll lock in dialogs (Radix), `aria-current` on the active route, labelled controls
(`Field` wires `htmlFor`/`aria-describedby`), `aria-live` on the pagination range and toasts, a
skip-to-content link, and keyboard support on every interactive element.

---

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | same-origin `/api` | Point the app at a real/staging backend |
| `PORT` (server) | `3001` | Mock API port |
| `MOCK_LATENCY_MS` (server) | `140` | Simulated latency, so loading/skeleton states are exercised in dev |

Pointing at a real backend is a one-line env change (`VITE_API_BASE_URL`) plus, if the shapes
differ, the mappers in `model/wire.ts`.

---

## Conventions

- **TypeScript strict**, including `noUncheckedIndexedAccess` — indexed access is `T | undefined`,
  so array lookups are guarded.
- **One component per file**, co-located `*.test.tsx`. Components ≤ 300 lines; functions/hooks ≤ 50.
- **Imports** use the `@/` alias for `src`.
- **No raw hex in components** — only semantic tokens.
- **Validate at the edge** — never trust a payload; parse it with Zod first.
- ESLint + Prettier enforced via `lint-staged` on commit.

---

## How to extend

**Add an endpoint** — add it inside `contactsApi.injectEndpoints`, with a Zod `transformResponse`
and the right `providesTags` / `invalidatesTags`. Export the generated hook.

**Add a list filter** — extend `ContactFilters` + `DEFAULT_FILTERS`, teach the **one** codec
(`encodeFilters` / `decodeFilters`), apply it in `filterContacts`, and add the control to
`SegmentFilters`. The type system forces you through every spot.

**Add a whole feature** — create `src/features/<name>/` with the same layers, `baseApi.injectEndpoints`
for its data, and a side-effect import in `app/store.ts`. The store config itself stays untouched.

---

## Further docs

- [Architecture](docs/ARCHITECTURE.md) — structure, data flow, server/MSW parity
- [API](docs/API.md) — endpoints + wire schemas
- [Design System](docs/DESIGN-SYSTEM.md) — tokens, primitives, motion
- [Testing](docs/TESTING.md) — the pyramid and how to run it
- [Decisions](docs/DECISIONS.md) — ADRs (why Redux, standalone, Express+MSW, scope)
- [Engineering Notes](docs/ENGINEERING-NOTES.md) — the reasoning, alternatives weighed, and trade-offs behind the build

---

## Tooling note

`.code-graph/graph.json` is generated by [**mcp-indexer**](../mcp-indexer) — a reusable
code-intelligence engine that indexes any TypeScript/React repo into a queryable code graph and
serves it over HTTP, a CLI, and MCP. This app is its worked example, treated as a standalone repo
with zero special-casing:

```bash
cd ../mcp-indexer && pnpm install && pnpm build
pnpm serve:app     # → http://localhost:3002/api/graph  (live, file-watched)
```
