# Architecture

Two independent projects in one repo. They don't share a build, lockfile, or
`node_modules`. The indexer can *observe* the app (it's the indexer's worked example) but
the app does not depend on the indexer.

```
the-plan-beyond/
├── app/            The product. "My People" feature, production-depth.
└── mcp-indexer/    Code-intelligence engine + 3D graph UI. Indexes any TS/React repo.
```

## The app — request/data flow

```
 Component
   │  uses an RTK Query hook (useGetContactsQuery, useUpdateContactMutation, …)
   ▼
 RTK Query (src/app/baseApi.ts)  ──fetch──▶  /api/*  ─┬─ [dev]   Vite proxy → Express mock (server/index.ts)
   │   transformResponse: Zod.parse           │       └─ [test]  MSW intercept (src/test/msw/)
   │   (wire snake_case → domain camelCase     │
   │    via model/wire.ts)                     ▼
   ▼                                    createContactsService()  ← ONE implementation,
 normalized cache (tags: Contact, ContactList)   shared by Express + MSW + e2e
```

- **UI state** (search / filters / sort / letter / page / selection) lives in a thin Redux
  slice (`model/contactsSlice.ts`), *separate* from server state. `useContactsQuery`
  composes the slice's filters (debouncing search) into the RTK Query request.
- **Detail edit** uses a **local draft** (`useContactDraft`) — not RTK Query mutations on
  every keystroke. The draft diffs against the server copy (`deepEqual`) for `isDirty`;
  Save sends the whole draft and reconciles to the canonical response.
- **The single query codec** (`encodeFilters`/`decodeFilters` in `model/filters.ts`) is
  used by the client, the Express server, and the MSW handlers, so a filter can't be
  dropped by one side.

### Why a mock service, not a real backend
This is a self-contained build. `createContactsService` is an in-memory CRUD + filter +
dedup implementation. The same instance backs:
- **dev** — wrapped by Express (`server/index.ts`), proxied at `/api`.
- **tests** — wrapped by MSW handlers (`src/test/msw/handlers.ts`).
- **e2e** — the Express server booted by Playwright.

Pointing at a real backend is a one-line env change (`VITE_API_BASE_URL`) plus, if shapes
differ, the mappers in `model/wire.ts`. Nothing else in the app changes.

## The indexer — pipeline

```
target repo ──▶ discoverWorkspace ──▶ indexMacro ──▶ indexStructure ──▶ buildSnapshot
                (mono vs standalone)   (repo/app/    (files+symbols,      (Zod-validated)
                                        pkg/folder)   then semantic pass)        │
                                                                                 ▼
                              ┌──────────────────────────────────────────────────┤
                         CLI: .code-graph/graph.json   Server: GET /api/graph + WS   MCP: tools
                                                              │
                                                       apps/web/code-graph (3D viewer, :5182)
```

The indexer serves the graph three ways — **HTTP+WS** (`apps/indexer-server`, `:3002`),
a **CLI**, and an **MCP server** (`index_repo` / `get_graph` / `get_node`). The 3D web UI
is a pure consumer of the HTTP+WS API. See [`indexer.md`](indexer.md) and
[`mcp-indexer/CLAUDE.md`](../mcp-indexer/CLAUDE.md) for depth.

## How they relate at runtime

- `pnpm -C app dev` → app on `:5173`, mock API on `:3001`.
- `pnpm -C mcp-indexer serve:app` → indexer indexes `../app` live on `:3002`.
- `pnpm -C mcp-indexer ui` → 3D graph of the app on `:5182`.

You can run all three at once to *see* the app and *see its structure* side by side. The
indexer is also registerable as an MCP server so an agent can query the app's structure
instead of grepping.

## Boundaries & invariants (enforced by layout + the type system)

1. **Feature-first.** Everything about contacts lives under
   `app/src/features/contacts/`. The rest of `src` is generic infrastructure.
2. **One boundary for server data.** A single RTK Query `baseApi`; features inject
   endpoints. UI-only state lives in a slice. They never mix.
3. **Validate at the edges.** Zod parses every API response, the create form, the URL
   filter params, and parsed VCF — untyped data never flows inward.
4. **Anti-corruption layer.** snake_case wire ↔ camelCase domain mapping happens only in
   `model/wire.ts`.
