# Testing

A pyramid, not an ice-cream cone: many fast unit tests, focused integration tests
at the feature boundary, a thin e2e layer for the critical journeys.

## Layers

| Layer | Tooling | What it covers |
|---|---|---|
| **Unit** | Vitest | Pure utils (`filterContacts`, `vcfParser`, phone), Zod-backed `contactsService` (validation, dedup, CRUD), the `contactsSlice` reducer, and design-system primitives. |
| **Integration** | Vitest + RTL + **MSW** | Full feature behaviour in jsdom — list load/search/empty/delete, Add Contact validation/create/duplicate, detail dirty→save→discard, import (Google + VCF). Mocks only the fetch boundary. |
| **E2E** | Playwright | Real browser against the Express mock: list/search/paginate, edit + save, delete, add + validation + duplicate, VCF/Google import. |
| **A11y** | `@axe-core/playwright` | WCAG 2.1 A/AA scan of list + detail — asserts **zero** violations. |

## Philosophy

- Test **behaviour the user sees**, never implementation details or internal state.
- Mock **only at system boundaries** (HTTP via MSW) — never internal modules.
- One scenario per `it`. Tests share the same deterministic seed and the same
  service implementation as dev, so they can't drift from reality.

## Run

```bash
pnpm test            # unit + integration (watch: pnpm test:watch)
pnpm test:cov        # coverage; thresholds enforced on features/contacts (≥80%)
pnpm e2e             # Playwright (needs: npx playwright install chromium)
pnpm ci              # lint → typecheck → test → build
```

E2E runs serially (`workers: 1`) because the mock API holds a single in-memory
store; each spec calls `POST /api/__reset` in `beforeEach` for a clean slate.

## Current state

49 unit/integration tests and 10 Playwright tests (incl. 2 axe scans) pass.
