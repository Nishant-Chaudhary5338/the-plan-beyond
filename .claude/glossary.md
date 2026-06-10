# Glossary

One-liners for the domain and technical terms used across the repo.

## Product / domain

- **My People** — the feature this build ships: the relationship hub (contacts + roles).
- **Trustee** — someone trusted to act on your behalf if you can't. Aggregate status.
- **Keyholder** — holds access to a specific thing, released when an event happens.
- **Beyond Circle** — people reached/given access after a triggering life event. Per-contact
  flag (`isBeyondCircle`, wire `share_after_death`) + the `notify_circle` aggregate.
- **Emergency (contact)** — reached first, immediately, in an urgent situation. Per-contact
  flag (`isEmergencyContact`).
- **Identifier** — the phone an invited person's account is matched to (`isIdentifier`).
- **Invite status** — product-invite standing (`not_invited` / `invited` / `joined`).
  Optional; the UI never fabricates it.
- **Plan readiness** — an honest 0–100 from three real signals (people added · trustee
  named · Beyond Circle set up). `planReadiness()` in `model/overview.ts`.

## App architecture

- **`baseApi`** — the single RTK Query `createApi`; features inject endpoints into it.
- **Anti-corruption layer (ACL)** — `model/wire.ts`: snake_case wire ↔ camelCase domain
  mapping, only at the boundary.
- **Filter codec** — `encodeFilters`/`decodeFilters` (`model/filters.ts`): the one
  client+server+MSW serializer for the list query string.
- **`createContactsService`** — the in-memory CRUD/filter/dedup service shared by Express
  (dev), MSW (tests), and e2e.
- **Mock ↔ server parity** — the rule that the Express mock and MSW implement identical
  endpoints.
- **Draft engine** — `useContactDraft`: local editable draft + `isDirty` (via `deepEqual`)
  + explicit save that reconciles to the server response.
- **Optimistic update** — `updateContact` patches the cache before the response and rolls
  back (`undo()`) on failure.
- **E.164 canonical** — the normalized international phone form; the dedup key. Produced by
  `lib/phone.ts` `canonicalizePhone` (gate: `isPossible()`).
- **Semantic tokens** — the named design colors (`text-content`, `bg-surface`, …); the only
  thing components may use for color. The palette is **locked**.
- **`InfoPopover` (ⓘ)** — the in-context definition affordance.
- **`OptionalField`** — wraps a form field; collapses to "+ Add {label}" when empty.
- **`StatusLine`** — dot + reassuring copy (color is never the only signal).

## Indexer

- **Code graph** — nodes (`repo/app/package/folder/file/component/function`) + edges
  (`contains/imports/references/renders/calls/depends-on`) describing a TS/React repo.
- **Snapshot** — a Zod-validated graph at a point in time (`.code-graph/graph.json`).
- **GraphPatch** — an incremental delta (upsert/remove nodes/edges) pushed over WS on edits.
- **Discriminated union (node schema)** — each node variant carries only its legal fields;
  read via `nodePath`/`hasMetrics`/`hasSpan` guards.
- **`reparseFiles`** — the live-edit path: re-extract changed files + one hop of importers,
  re-run the semantic pass, emit a reconciled patch.
- **Structural vs semantic pass** — structural builds file/symbol nodes + file-level edges;
  semantic resolves `renders`/`calls` over the full symbol table (conservative: only emits
  an edge when the target resolves to a real indexed node).
- **MCP** — Model Context Protocol; the indexer exposes `index_repo` / `get_graph` /
  `get_node` so an agent can query structure instead of grepping.

## Toolchain

- **RTK Query** — Redux Toolkit's data-fetching/caching layer (server state).
- **MSW** — Mock Service Worker; intercepts fetch in tests.
- **Radix UI** — unstyled accessible primitives the design system wraps.
- **Tailwind v4** — CSS-first (`@theme` in `index.css`); no `tailwind.config.js`.
- **ts-morph** — the TypeScript AST library the indexer uses.
- **Turborepo / pnpm workspaces** — the indexer's monorepo tooling.
