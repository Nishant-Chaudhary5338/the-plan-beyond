# Project Memory

A running log of *why the code is the way it is* — decisions, history, and current
state — so a new session starts informed instead of clueless. **Newest first.** Add a
dated entry when you make a meaningful change. Keep entries short and factual.

---

## Current state (snapshot)

- **Repo**: two independent projects — `app/` (the product, "My People" feature) and
  `mcp-indexer/` (a code-intelligence engine + 3D graph UI). No shared lockfile.
- **Default branch**: `main`. Active work branch: **`improved-ux`** (UX pass; pushed to
  `origin/improved-ux`).
- **Gates (app)**: `pnpm ci` green — ESLint (0 errors), `tsc -b` strict, **139 unit/
  integration tests**, coverage thresholds on `features/contacts/**` (≥80/75) and
  `lib/**` (≥85/80), Vite build, **Playwright + axe e2e 20/20** (chromium + mobile).
- **Gates (indexer)**: `turbo build` / `typecheck` / `lint` (all 4 packages) / `test`
  green. Server + 3D UI run live.
- **Toolchain**: Node ≥ 20.19, **pnpm 10** (pinned `pnpm@10.32.1`). Local pnpm is 10.32.1.

### Known in-flight (uncommitted, parallel session)
A second session is extending the detail/list UX on `improved-ux`:
- **Invite status** is now a real (optional) field on the Contact model + wire layer
  (`invite: { status: 'not_invited' | 'invited' | 'joined', invitedAt?, joinedAt? }`),
  read from `invite_status`/`invited_at`/`joined_at` on the wire. The UI omits any invite
  claim when the backend doesn't send it (no fabricated status).
- **Plan readiness** (`planReadiness()` in `model/overview.ts`) — an honest 0–100 derived
  from three real `/people` signals (people added, a trustee named, Beyond Circle set up).
  This is the principled answer to the brief's "A6 (blocked)" item: no invented metric.
- **Touched-state validation** — required-field errors only show after blur, not on a
  pristine contact.
- Roles summary now derives from *active roles* (emergency / beyond circle / relationship
  / groups), not just group count.

> If you're picking up that work: confirm `pnpm ci` is green before committing, and add a
> memory entry. The committed history below is the stable baseline.

---

## History (most recent first)

### UX pass — "improved-ux" branch
Implemented an empathetic UX brief for "My People" + Contact Details (Waves 1–3 + 5).
Key additions and the reasoning:

- **Retired "At risk"** framing on the Trustees card → warm, finishable status ("No
  trustees yet · Add one to activate your plan") with a *quiet* amber dot. Rule: **color
  is never the only signal** — always pair a dot with words.
- **ⓘ definitions** (`InfoPopover`) on Trustees / Keyholders / Beyond Circle / Emergency.
  All copy comes from a single source: `features/contacts/model/microcopy.ts`, used
  identically on the list and detail pages so wording can't drift.
- **Detail identity band** (read-only chips: relationship, groups, Emergency, Beyond
  Circle + meta line). Editing stays in the Roles card — the band only reflects state.
- **Safe role toggles**: turning a role **ON** is instant; turning it **OFF** opens a
  quiet confirm naming what it removes, then offers an **Undo** toast. Consequence line
  under each toggle. (Reuses Sonner + the existing optimistic path.)
- **Navigation guard** (`useUnsavedGuard` = React Router `useBlocker` + `beforeunload`)
  so unsaved edits can't be lost on back-link / sidebar / browser-back. Plus an "All
  changes saved" confirmation flash in the bar (it used to just vanish).
- **Delete moved to a ⋯ overflow menu**, away from the Invite action (mis-click safety).
- **Empty optional fields collapse to "+ Add {label}"** (`OptionalField`); Professional
  section is **collapsed by default** (`SectionCard collapsible`).
- **A–Z rail dims + skips empty letters** — driven by server-computed `available_letters`
  on the `/people` overview.
- **Beyond Circle column**: symmetric, legible On/Off pills (read-only; chose Option A).
- **Decision A6 (plan readiness)** was initially deferred (needs a product definition of
  "ready"); the parallel session has since implemented an honest version (see above).

**Layout fixes after the visual review:**
- `Dialog` now caps height to the viewport with an internally-scrolling body (the Import
  modal was overflowing and hiding its footer).
- Detail page uses natural column heights (`items-start`) — the earlier `flex-1` Notes
  fill assumed the right column was always taller, which broke once fields collapsed.
- People sidebar `overflow-y-auto` so a taller Trustees status can't spill below the panel.

**Test-harness change**: `renderWithProviders` now uses a **data router**
(`createMemoryRouter` + `RouterProvider`) to mirror production's `createBrowserRouter`, so
`useBlocker` works in tests. New helper `reveal(user, label)` clicks "+ Add {label}"
before editing a collapsed field.

### Code-review remediation (on `main`)
A multi-agent review found real issues; all legitimate ones were fixed (the reviewer also
correctly debunked three "phantom" criticals — Avatar a11y, a Checkbox "leak", group-
filter OR-vs-AND — which we did **not** chase). Highlights now baked in:
- **VCF parser rewritten** — RFC-6350 line unfolding, escape handling, multi-`TEL`
  ranking, quoted-printable, region-aware phone parsing.
- **E.164 canonicalization centralized** in `lib/phone.ts` (`canonicalizePhone`) and used
  in the service, wire layer, and forms; **dedup compares canonical E.164** so trunk-zero
  / formatting variants collapse. (Uses `isPossible()`, not `isValid()`, so the project's
  own demo numbers — e.g. a UK drama range — are accepted.)
- **`genId` hardened** against collisions (monotonic counter + `getRandomValues`).
- **Filters codec** — integer/range/enum guards; `decode(encode(f))` round-trip tested.
- **Optimistic update fixed** — full-value replace (not `Object.assign` merge) and **no
  self-defeating `{Contact,id}` invalidation**; the draft is owned locally so a failed
  save rolls back the cache yet keeps the user's edits to retry.
- **a11y**: lightened the danger token + neutral badge to clear WCAG AA on every surface;
  `indeterminate` checkbox; filter menus rebuilt as `role="menu"`/`menuitemradio`.
- **Selection feature finished** — clears on nav/filter/search; working bulk delete.
- **Tests**: grew from 90 → 139, incl. phone canonicalization, deepEqual, genId, optimistic
  rollback, bulk delete. Coverage gate extended to `src/lib/**`.

### Indexer hardening + 3D UI port (on `main`)
- **Engine**: real content-hash incremental cache; `reparseFiles` for live edits;
  detection of `forwardRef`/`memo`/HOC/anonymous-default/class components; barrel + dynamic
  + type-only import edges; tsconfig `paths`; node schema is now a **Zod discriminated
  union** (use the exported `nodePath(node)` / `hasMetrics(node)` guards — don't access
  `node.path`/`node.metrics` on the union directly); line-stable function IDs.
- **Server**: serialize mutex + atomic snapshot swap; async error middleware (Express 4);
  binds to `127.0.0.1`; `/chat` input validation + rate limit + subprocess semaphore;
  `claude-cli` kill-tree on timeout; graceful shutdown; WS error/close/heartbeat/back-
  pressure; a friendly self-describing `GET /` root route.
- **3D UI** (`apps/web/code-graph`, React 19 + `react-force-graph-3d`) was **ported from
  the original `my-turborepo`** repo (it had been left out of the copy). Adapted to the new
  discriminated-union schema. Runs on `:5182` (`pnpm ui`), proxying `/api` + `/ws` → `:3002`.
- **Tooling**: indexer CI; lint all 4 packages; pnpm pinned to 10 with a regenerated
  lockfile; honesty pass over READMEs (a claimed-but-missing Husky hook was actually
  created; "Lighthouse 100" softened to "local audit, not gated").

### Genesis
Single squashed commit `9f81f55` ("The Plan Beyond — app + code-intelligence indexer") —
the original take-home submission: the React app implementing "My People" to production
depth, plus the indexer. Everything above is layered on top.

---

## Durable decisions (the "don't re-litigate these" list)

- **Explicit save, never autosave** on the contact detail page. Deliberate edits to
  consequential roles are the correct emotional model for this product.
- **Single shared `createContactsService`** drives the Express mock, MSW, and e2e — so
  dev / unit / e2e behave identically. Add endpoints in **both** transports.
- **One RTK Query `baseApi`**; features inject endpoints. Adding a feature touches one
  side-effect import in `store.ts`, nothing else shared.
- **Anti-corruption layer** (`model/wire.ts`): snake_case wire ↔ camelCase domain mapping
  happens **only** at the boundary; the rest of the app sees the clean model.
- **Color palette is locked**; semantic tokens only; no raw hex in components.
- **Indexer node schema is a discriminated union** — access variant fields via the
  exported guards, not directly.
