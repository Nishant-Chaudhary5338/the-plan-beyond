# Testing

A standard pyramid. ~139 unit/integration tests (Vitest + Testing Library + MSW) across 24
files, plus Playwright e2e (chromium + mobile) including axe a11y scans.

## Commands

```bash
cd app
pnpm test          # vitest run
pnpm test:watch
pnpm test:cov      # + V8 coverage with enforced thresholds (what `pnpm ci` runs)
pnpm e2e           # playwright (first run: npx playwright install chromium)
pnpm e2e:ui
```

## Layers

- **Unit** — pure logic: the filter codec round-trip, `filterContacts`, `wire` mappers,
  `vcfParser`, `phone` canonicalization, `deepEqual`, `genId`, the slice.
- **Integration** — components against the **real** `createContactsService` via MSW.
  `renderWithProviders` wires Redux + a **data router** + Tooltip + a pre-bound
  `userEvent`. Covers the list, the detail edit/save/rollback flow, dialogs, filters,
  sidebar, nav.
- **E2E + a11y** — Playwright drives the full app (Express mock booted by the runner). The
  a11y spec asserts **zero axe violations** on list + detail, on chromium and mobile.

## The harness — important details

- **`src/test/renderWithProviders.tsx` uses a data router** (`createMemoryRouter` +
  `RouterProvider`) to mirror production's `createBrowserRouter`. This is required so
  data-router hooks like `useBlocker` (the unsaved-changes guard) work in tests. If you
  see "useBlocker must be used within a data router," something bypassed this harness.
- **MSW** (`src/test/msw/`) wraps the same `createContactsService`. `mswServer.use(...)` in
  a test overrides a handler (e.g. force a 500 to test optimistic rollback);
  `afterEach` resets handlers + the service (`src/test/setup.ts`).
- **`reveal(user, label)` helper** (in `ContactDetailPage.test.tsx`): optional empty fields
  collapse to "+ Add {label}" (UX brief B7), so click that button before editing. The
  Professional section is collapsed by default (B8) — expand it first
  (`getByRole('button', { name: 'Professional' })`).

## Conventions that keep tests honest

- **Query by role/label, not test ids or snapshots.** Zero `getByTestId`, zero snapshots.
- Prefer `findBy*` for async appearance; `waitFor` only for disappearance/negative
  assertions.
- Assert **behavior**, not implementation. Tests caught real bugs (DOB/avatar loss through
  serialization; a dropped Radix `onClick`/`ref`; the optimistic-rollback path) — keep that
  bar.
- When a UI change alters accessible names (e.g. adding an ⓘ creates an "About X" button
  that collides with a `/x/i` query), tighten the test query (use exact names) rather than
  loosening the component.

## Coverage gates (enforced in `pnpm ci`)

`vitest.config.ts` thresholds:
- `src/features/contacts/**` ≥ 80% statements/functions/lines, 75% branches.
- `src/lib/**` ≥ 85% statements/lines, 80% branches.
Excludes are honest (test files, `src/test/**`, `main.tsx`, barrels). Don't add excludes to
hit a number — add a test.

## Indexer tests

`cd mcp-indexer && pnpm test` runs (via turbo) Vitest for the schema + engine packages and
`node:test` for the server (`apps/indexer-server/src/*.test.ts`). The engine has tests for
component/import detection edge cases and the incremental cache. Build first (`pnpm build`)
— the server imports the compiled engine.
