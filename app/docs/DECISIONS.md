# Architecture Decision Records

Short, dated records of the choices that shaped this build.

## ADR-001 — Standalone repo, no shared packages
**Decision:** Ship as a self-contained app with its own small design system, zero
private/workspace dependencies.
**Why:** It's a hand-in. A reviewer should `clone → install → run` without a monorepo.
Portability and a clear, readable surface beat maximal reuse here.

## ADR-002 — Redux Toolkit + RTK Query for state & data
**Decision:** Server state via RTK Query; UI-only state (search/filters/sort/selection)
in a slice.
**Why:** Requested explicitly, and it's the right tool: RTK Query gives caching, tag
invalidation, optimistic updates, and loading/error flags for free. Keeping server and
UI state separate avoids the usual "everything in one store" tangle.

## ADR-003 — Express mock + MSW, one shared service
**Decision:** A single `contactsService` (in-memory CRUD + Zod validation) backs both
the Express dev/e2e server and the MSW test handlers.
**Why:** Dev, tests, and e2e then exercise identical behaviour — no drift between a
hand-written mock and the test doubles. The provisional API can be reconciled against
the real backend in one folder.

## ADR-004 — Zod at every boundary
**Decision:** Validate API responses, the create form, and parsed VCF with Zod; infer
TS types from the schemas.
**Why:** Strict TypeScript guarantees nothing at runtime. Parsing at the edges means a
malformed payload fails loudly at the boundary, not three layers deep.

## ADR-005 — Radix primitives, owned styling
**Decision:** Use Radix for Dialog/Select/Popover/Switch/Tooltip behaviour; style with
Tailwind tokens.
**Why:** Focus management, keyboard nav, and ARIA are easy to get subtly wrong.
Borrow the hard, invisible parts; own the visible, on-brand parts.

## ADR-006 — Google import mocked, VCF fully implemented
**Decision:** Implement VCF parsing end-to-end; mock the Google OAuth + People API.
**Why:** Real Google OAuth needs credentials and a consent screen — out of scope for an
offline demo. The mock proves the full flow (connect → review → import) without it.

## ADR-008 — Anti-corruption layer for the real API shape
**Decision:** Keep a clean camelCase internal `Contact` model; map to/from the live
snake_case wire shape (`first_name`, `phone_list`, `share_after_death`, …) only at the
RTK Query / mock boundary (`model/wire.ts`).
**Why:** The real payloads are flatter and snake_cased, and relationship/group labels are
free-form. Mapping at one boundary means the UI, store, and tests stay on a tidy model
while the wire format matches production exactly — reconciling against new real bodies
touches one folder. Validated against the actual create/edit/`/people` responses.

## ADR-007 — Storybook scoped out
**Decision:** No Storybook in this repo.
**Why:** Heavy install for a focused hand-in; primitives are small and documented via
co-located tests + [DESIGN-SYSTEM](DESIGN-SYSTEM.md). Easy to add later if the team
adopts it.
