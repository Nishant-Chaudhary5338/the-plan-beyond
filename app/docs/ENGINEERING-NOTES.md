# Engineering Notes — The Plan Beyond (My People)

This is the long-form companion to the terse [ADRs](DECISIONS.md): the reasoning behind the build, the alternatives I weighed and rejected, and the trade-offs I made on purpose. It's written for the next engineer on this code — the "why," not just the "what." Where the README answers *how do I run it* and the ADRs record *what we decided*, this document records *how I was thinking*.

> **Product vs. feature.** *The Plan Beyond* is the product; **My People** is the one feature implemented here, built to production depth inside a real app shell rather than as an isolated widget. Most decisions below are about making one feature feel like part of a system that could hold twenty.

---

## 1. What "production-grade" meant for this build

A take-home can be done two ways: a thin slice that demos, or a narrow slice built like real software. I chose the second. The bar I held myself to:

- **A reviewer can `clone → install → run` with no backend to stand up.** That constraint drove the mock-API design (§7) more than anything else.
- **Nothing untyped flows inward.** Strict TypeScript plus Zod at every boundary (§3.6).
- **The feature is a vertical slice of a system**, not a page. Folder structure, the data boundary, and the design system are all built so a second feature would be additive, not surgery (§2).
- **Quality is enforced, not asserted.** `pnpm run ci` runs lint → typecheck → `test:cov` → build, and the coverage thresholds fail the build if they regress (§10).

Everything that follows is downstream of those four commitments.

---

## 2. The shape of the app

The layout is **feature-first**, with a strict dependency direction:

```
features/contacts  →  components/ui  →  lib
        (app)            (shared)     (pure helpers)
```

`features/contacts/` owns everything about the feature — its API endpoints, domain model, components, hooks, pages, and utilities. Everything outside it is generic infrastructure: the design system (`components/ui`), the app shell (`components/layout`), store wiring (`app/`), and framework-agnostic helpers (`lib/`). `lib/` depends on nothing app-specific, so there's no path for a cycle.

**Why feature-first over layer-first** (all components in one folder, all hooks in another): layer-first scales by *type* and falls apart by *feature* — to understand "contacts" you'd hop through six top-level folders. Feature-first keeps the thing you actually reason about in one place, and the boundary between "my feature" and "shared" is where I'd later add an ESLint `no-restricted-imports` rule to stop cross-feature reach-in. I didn't add that rule yet because there's exactly one feature; it would be ceremony today (see §12).

Inside the feature, components are grouped by **screen area** (`list/`, `detail/`, `add/`, `import/`, `sidebar/`) rather than dumped together. At ~25 components that grouping is the difference between navigable and not, and it maps to how the UI is actually built.

---

## 3. Data and state — the spine of the app

This is where most of the real decisions live.

### 3.1 Two kinds of state, kept apart

There are two fundamentally different things people call "state," and conflating them is the most common way a React app rots:

- **Server state** — contacts, the `/people` aggregate. It's *owned elsewhere*, can go stale, and needs caching, refetching, and invalidation. This lives entirely in **RTK Query**.
- **UI state** — search text, active filters, sort, row selection, pagination. It's *owned by this client* and ephemeral. This lives in a thin Redux **slice** ([`contactsSlice.ts`](../src/features/contacts/model/contactsSlice.ts)).

They never mix. The slice holds no server entities; RTK Query holds no UI flags. The payoff is that I never hand-wrote a single `isLoading`/`isError` boolean or a manual cache — those come from RTK Query — and the UI state stays trivially serializable and testable.

### 3.2 One API instance, feature-injected

There is exactly **one** `createApi` in the app ([`app/baseApi.ts`](../src/app/baseApi.ts)). Features don't create their own API — they call `baseApi.injectEndpoints(...)` ([`contactsApi.ts`](../src/features/contacts/api/contactsApi.ts)).

**Why one and not one-per-feature:** the base URL, headers, and the cache-tag registry live in a single place, and the store never has to learn about each feature's reducer or middleware. Adding a feature is a side-effect import in [`store.ts`](../src/app/store.ts) — the store config itself stays untouched. With per-feature `createApi` instances you get N middleware chains, N cache silos that can't cross-invalidate, and a store that grows a line per feature. Injection is how RTK Query is meant to scale, and it's the difference between "one feature" and "a platform."

`resolveApiBase()` defaults to a same-origin `/api`, overridable via `VITE_API_BASE_URL`. It resolves to an absolute origin when one exists specifically because jsdom's `fetch` (in tests) needs an origin to parse a request — a small thing that makes the exact same data layer run unchanged in the browser, Node, and tests.

### 3.3 Cache tags — the invalidation mental model

Two tags: `Contact` (per-id) and `ContactList`. The list query *provides* a tag for every row plus a `LIST` tag; mutations *invalidate* the tags they affect. Create/delete/import invalidate `ContactList` (the set changed); update invalidates both the specific `Contact` and the list. That's the whole model — declarative, and it means a successful mutation refetches exactly what it should with no manual `refetch()` calls scattered around.

### 3.4 Optimistic edit with rollback

`updateContact` applies an **optimistic** cache patch in `onQueryStarted` so the detail view reflects a save instantly, then rolls back if the request fails:

```ts
const undo = dispatch(contactsApi.util.updateQueryData('getContact', id, (d) => Object.assign(d, contact)));
try { await queryFulfilled; } catch { undo.undo(); }
```

**Why optimistic here specifically:** editing a contact is high-confidence (client-validated, single owner), so the latency of a round-trip shouldn't gate the UI; and the rollback path is cheap and correct. I did *not* make create/delete optimistic — those change list membership and ordering, where a rollback is more visually jarring than a brief spinner. Optimism is a per-operation judgment call, not a blanket policy.

### 3.5 The anti-corruption layer — the most important boundary

The real API speaks flat **snake_case** (`first_name`, `phone_list`, `share_after_death`, free-form relationship/group labels). The app speaks clean **camelCase** with a tidy nested `Contact`. Bridging them is [`model/wire.ts`](../src/features/contacts/model/wire.ts): Zod schemas for the wire shapes plus pure `fromWireContact` / `toWireContact` mappers, applied **only** at the RTK Query/mock boundary.

**Why pay for a mapping layer at all** instead of just using the wire shape everywhere: the wire shape is a *production contract I don't control*, and letting it leak inward means every component, selector, and test is coupled to `share_after_death` and `phone_list[0].is_primary`. With the boundary, the entire app reasons about `isBeyondCircle` and `phones`, and reconciling against a changed real payload touches **one folder**. This is the classic anti-corruption layer from DDD, and it earns its keep the moment the backend shape and the UI's needs diverge — which they already do here (single-select relationship UI over a multi-value wire field; fixed title dropdown over free-form wire title).

**The lesson that made this real:** an early version *wrote* `date_of_birth`/`anniversary` outbound but forgot to *read* them back in `fromWireContact`. Result: you'd set a birthday, save, and watch it silently revert one refetch later. Round-trip mapping is only correct if it's symmetric, and the fix was to treat "every field the form edits must survive a `toWire`→`fromWire` round-trip" as an invariant — now covered by tests in [`wire.test.ts`](../src/features/contacts/model/wire.test.ts).

### 3.6 Zod at every edge — parse, don't assert

Strict TypeScript guarantees nothing at runtime; a `JSON.parse` is `any` wearing a type. So every inbound boundary is **parsed**, not cast: API responses (`transformResponse: (raw) => schema.parse(raw)`), the create form, env-shaped input, and parsed VCF. TS types are *inferred from the schemas* (`z.infer`), so there's one source of truth and the runtime check and the compile-time type can't drift.

The practical effect: a malformed payload fails loudly *at the boundary* with a clear Zod error, instead of becoming an `undefined.map` crash three components deep. The cost is a parse per response, which is negligible against a network round-trip.

### 3.7 The draft model and dirty-tracking

The detail/edit screen runs on [`useContactDraft`](../src/features/contacts/hooks/useContactDraft.ts): it loads the server copy, holds an editable `draft`, exposes typed field/array helpers (`patch`, `addPhone`, `setIdentifier`, …), and computes `isDirty` by comparing draft to server. The floating unsaved-changes bar is driven entirely by `isDirty`; save is an optimistic `updateContact`.

**Why a local draft rather than editing the cache directly:** the cache is shared truth; the draft is a private scratch space. Keeping edits local means "discard" is trivial (re-seed from server), the unsaved bar has a clean signal, and a background refetch doesn't fight the user's keystrokes.

**The honest trade-off:** `isDirty` is `JSON.stringify(server) !== JSON.stringify(draft)`. It's simple and correct *here* because both objects share a key order (same construction path), but it's order-sensitive and re-serializes the whole object on each render. For this object size it's invisible; at scale I'd switch to field-level dirty tracking or a structural compare. I left it deliberately simple and flagged it rather than reaching for a library — see §12 for the related refetch-during-edit edge case I'd harden next.

---

## 4. The list experience

The list is the busiest surface: debounced search, A–Z index, sort, segment filters (groups / Beyond Circle / emergency / relationship), and pagination — all composed into one request.

**Filters are a single codec.** `encodeFilters`/`decodeFilters` in [`model/filters.ts`](../src/features/contacts/model/filters.ts) are the *one* place the filter object becomes a query string and back. The client encodes; the Express server and the MSW handlers both decode with the same function. **Why centralize it:** the most insidious filter bug is the silent one — the client sends a param the server forgot to read, and a filter just quietly does nothing. With a shared codec that's structurally impossible: adding a filter means editing one function that both sides import.

**The page-reset invariant lives in the reducer.** `setFilter` resets `page` to 1 on any non-page change. Putting that rule in the reducer (not in each component that changes a filter) means it can't be forgotten at a call site — change a filter anywhere and pagination resets correctly.

**Why search is debounced and filters aren't:** typing produces a burst of intermediate states you don't want to fire requests for; clicking a segment is a single deliberate act. Debouncing only the keystroke path keeps the UI responsive without wasting round-trips.

**Why filters aren't URL-synced** (a deliberate cut): URL-syncing search/sort/filters is genuinely nice for shareable, reloadable views, but it's a meaningful chunk of work (serialization, history semantics, back-button behavior) for a single-session demo. I kept state in the slice and noted it as the first thing I'd add for a real deployment (§12) rather than half-build it.

---

## 5. Forms and input

The create form uses **React Hook Form + Zod** via `@hookform/resolvers`. RHF keeps re-renders local to the fields being typed; Zod is the same validation tooling used at the data boundary, so the form and the API agree on what "valid" means.

The phone picker uses **`libphonenumber-js`** for a searchable country-code selector and real E.164 validation — phone validity is famously not a regex, and the server dedupes on the E.164 form, so "valid" has to mean the same thing on both sides. The create flow validates client-side *and* server-side, with an inline server-error banner for the 409 (duplicate number) case — because client validation is UX, not a guarantee.

One subtle bit: the form resets **only when the dialog opens** (an `open`-gated effect with `exhaustive-deps` deliberately and explicitly disabled). Resetting on every render or on every dependency identity change would stomp a half-typed form; resetting on open is the actual intent, and the disable is commented to say so.

---

## 6. Routing, code-splitting, and resilience

Routes are **lazy** ([`app/routes.tsx`](../src/app/routes.tsx)) and code-split — the list and detail pages are separate chunks, so the initial load doesn't carry the whole app. A `Suspense` fallback in the app shell covers the load, and a top-level **error boundary** keeps a render crash in one route from taking down the persistent chrome (nav rail + top bar). A "skip to content" link and proper landmarks make the shell keyboard- and screen-reader-navigable from the first tab.

The non-People routes intentionally render a branded "work in progress" placeholder rather than 404ing — the point is to show the feature lives inside a real product shell, not a bare page.

---

## 7. The mock backend — the decision that shaped testing

The brief was offline-runnable, so there's no real server. The important choice wasn't "use a mock" — it was **one mock, shared three ways.**

A single `createContactsService` ([`api/contactsService.ts`](../src/features/contacts/api/contactsService.ts)) implements the in-memory CRUD, validation, dedupe, and the `/people` aggregate. The **Express** dev/e2e server and the **MSW** test handlers both call that same service. So dev, unit/integration tests, and e2e exercise *byte-for-byte identical* behavior — there's no hand-written mock that can drift from the test doubles, which is the usual failure mode where tests pass against a fiction.

Supporting decisions:
- **Simulated latency** in the Express layer so loading/skeleton states are actually exercised in dev, not just in theory.
- A **`__reset`** endpoint so e2e can return to a deterministic seed between specs.
- The seed dataset is deterministic ([`mocks/seed.ts`](../src/features/contacts/mocks/seed.ts)), so tests assert on known data.

**The trade-off I accepted:** the service holds a single in-memory store at module scope, which is why Playwright runs serially (`workers: 1`). For a mock that's the right simplicity-for-correctness trade; in a real backend this state would be per-request/per-user. I'd rather name that ceiling than pretend it isn't there.

---

## 8. The design system

Styling is **Tailwind v4** with **CSS-first design tokens** declared in `@theme` ([`index.css`](../src/index.css)) — color, spacing, and type scale as tokens, not magic numbers scattered through className strings. The palette was pulled from the real Plan Beyond beta (teal canvas / emerald accent) so the build looks like the product, not a default theme.

For interactive primitives — Dialog, Popover, Select, Switch, Tooltip — I use **Radix**. **Why borrow these specifically:** focus trapping, keyboard navigation, and ARIA wiring are the parts that are easy to get subtly, invisibly wrong and expensive to test by hand. I borrow the hard invisible parts and own the visible, on-brand parts (styling via tokens, variants via `class-variance-authority`). Motion and toasts use `motion` and `sonner`. **Storybook was scoped out** on purpose (ADR-007): a heavy install for a focused hand-in when the primitives are small and documented by co-located tests and [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

---

## 9. Accessibility — treated as a build gate

Accessibility isn't a pass at the end here; it's wired into e2e. The Playwright suite runs **axe** against the real pages, so a WCAG violation fails CI the same way a broken test does. On top of the automated checks: a skip link, semantic landmarks, labelled controls, focus management inherited from Radix, and visible focus states. The result is axe-clean WCAG 2.1 AA — gated in CI — plus Lighthouse 100 for Accessibility in local audits (the axe gate, not Lighthouse, is what catches regressions; Lighthouse is a spot-check, not a CI gate). The point is a guardrail that catches regressions instead of trusting a one-time audit.

---

## 10. Testing strategy

A real pyramid, not a coverage-number theater:

- **Unit** — pure logic in isolation: the filter codec, the wire mappers (including the round-trip invariant from §3.5), `filterContacts`, the VCF parser, the slice reducers.
- **Integration** — components against the **MSW**-backed real data layer (same service as §7), so a test exercises the actual RTK Query → fetch → parse → render path, not a mocked hook.
- **End-to-end + a11y** — Playwright drives the real app against the Express server, including axe.

**Coverage is enforced, not reported.** `pnpm run ci` runs `test:cov`, and [`vitest.config.ts`](../vitest.config.ts) sets thresholds on `features/contacts/**` (statements/lines 80, branches 75, functions 80). The point of putting `test:cov` in CI rather than plain `test` is that the thresholds can't silently regress — a PR that drops coverage fails the gate. I scoped the thresholds to the feature rather than the whole repo so they measure the code that matters, not the design-system glue.

**What I deliberately didn't chase:** 100% everywhere. Coverage is a floor that catches "you forgot to test this branch," not a goal in itself; past ~80% on real logic, the marginal test is usually asserting framework behavior.

---

## 11. Performance

- **Route-level code splitting** (lazy routes) keeps the initial bundle to the shell plus the landing page.
- **Manual vendor chunks** (`vite.config.ts`) split React, Redux, Radix, and `libphonenumber-js` into cacheable groups — the phone library in particular is large and rarely changes, so isolating it means it's cached across deploys. The app entry gzips to ~111 KB with the heavy, infrequently-changing deps split out.
- **Debounced search** (§4) avoids a request per keystroke.
- The list page is a **single-viewport layout** where only the table scrolls, so long lists don't reflow the whole page.

None of this is premature — each split corresponds to a real, measurable chunk, and the layout decision is about perceived performance (the chrome stays put) as much as raw numbers.

---

## 12. Honest trade-offs and what I'd do next

The part I'd most want a teammate to read. None of these are accidents; they're scope and simplicity calls I'd revisit with more time or a real backend.

1. **Dirty-tracking via `JSON.stringify`** (§3.7) — fine at this object size, but order-sensitive and O(n) per render. Next: field-level dirty tracking or a structural compare.
2. **Refetch-during-edit** — `useContactDraft` re-seeds the draft whenever the server copy changes. If a background refetch landed mid-edit, it could clobber unsaved keystrokes. It doesn't happen in practice here (nothing refetches `getContact` during an edit), but I'd gate the re-seed on `!isDirty` to make it robust by construction.
3. **Filters aren't URL-synced** (§4) — the first thing I'd add for a real deployment, for shareable/reloadable views.
4. **Single-relationship by product decision** — the detail form is single-select over a wire field that's an array; I map the first value. A real "multiple relationships" UI would change the form, not the boundary.
5. **Process-global mock store** (§7) — the reason e2e is serial. Correct for a mock; a real backend makes it per-user.
6. **No feature public-API barrier yet** (§2) — with a second feature I'd add `features/<name>/index.ts` as the public surface plus an ESLint rule banning deep cross-feature imports. Today it'd be ceremony for a single feature.
7. **`exactOptionalPropertyTypes` is off** — the wire mappers already use the disciplined conditional-spread pattern (`...(x ? { x } : {})`); turning it on would enforce by the compiler what I'm currently doing by hand.
8. **Storybook scoped out** (ADR-007) — easy to add if the team adopts it.

---

## Closing — the throughline

If there's one idea connecting all of this: **keep one clean internal model, validate every edge into it, and separate what the server owns from what the client owns.** The wire layer protects the model from the backend's shape; Zod protects it from bad data; the server/UI state split protects it from the "everything in one store" tangle; and the shared mock service makes sure the thing I test is the thing that runs. Every other decision — feature-first structure, injected endpoints, optimistic-where-safe, accessibility-as-a-gate, coverage-as-a-floor — is in service of making one feature feel like a piece of a system that could grow.
