# Design Notes — mcp-indexer

The reasoning behind the indexer: why a code **graph** instead of a file tree, how the engine is built, the decisions I made and what I traded away. The [README](../README.md) covers what it is and how to run it; this is how I was thinking.

> **Thesis:** a codebase is a graph long before it's a folder tree. Files *contain* symbols, modules *import* modules, components *render* components, packages *depend on* packages. Most tools flatten that into text (grep) or a tree (the file explorer). This indexer keeps it as a typed graph, validates it with a schema, and serves it to humans (HTTP/WS) and to AI agents (MCP) over the same engine.

---

## 1. Why a graph

`grep` answers "where does this string appear." A file tree answers "what's next to what on disk." Neither answers the questions you actually have about a codebase:

- *What does this component render, and what renders it?*
- *Which package depends on which?*
- *If I touch this file, what's downstream?*
- *Give an AI agent a map of this repo it can navigate, not 200 files to re-read.*

Those are **graph** questions — they're about typed relationships between entities. So the core artifact is a graph of typed **nodes** (the things) and **edges** (the relationships), persisted as a single validated snapshot. Everything else — the CLI, the server, the MCP tools — is a way to produce or query that one structure.

---

## 2. The graph model

Two enums in [`code-graph-core`](../packages/code-graph-core/src) define the whole vocabulary.

**Node types** (`node.schema.ts`) — deliberately two altitudes:

| Altitude | Types | What they are |
|---|---|---|
| **Macro** (structure) | `repo` · `app` · `package` · `folder` | the skeleton — workspace shape, from `package.json` + the directory tree |
| **Micro** (symbols) | `file` · `component` · `function` | the meat — extracted from the TypeScript AST |

**Edge types** (`edge.schema.ts`): `contains` (tree containment), `depends-on` (package → package), `imports` (module → module), `renders` (component → component), `calls` and `references` (symbol → symbol).

Every node carries the same shape regardless of type — `metrics` (`loc`, `exportsCount`), an optional `span`, a `status` block, and an optional `knowledge` summary. **Why one uniform node schema** instead of a discriminated union per type: consumers (a UI, an agent, a diff) can treat the graph generically — render any node, diff any node, enrich any node — without a switch over seven shapes. The `type` field carries the meaning; the envelope stays constant. The cost is some always-present-but-sometimes-null fields, which is a price worth paying for a stable contract.

**The macro/micro split is the central modeling decision.** The skeleton (workspace, packages, folders) comes cheaply from the filesystem and `package.json`; the symbols (components, functions, their imports/renders) require real parsing. Keeping them as distinct altitudes means a consumer can zoom from "12 packages and how they depend" down to "this component renders these three" in the same graph, and the cheap macro pass can run without paying for the expensive micro pass.

---

## 3. The pipeline

`runFullIndex` → `IndexerSession.indexFull()` runs four stages ([`engine/session.ts`](../tools/code-indexer/src/engine/session.ts)):

```
discoverWorkspace ─▶ indexMacro ─▶ indexStructure (ts-morph) ─▶ buildSnapshot
                                                              └▶ (later, progressive) enrichStatus
```

### 3.1 Workspace discovery

[`discover-workspace.ts`](../tools/code-indexer/src/engine/discovery/discover-workspace.ts) walks **up** from the target to find the repo root (the dir with `pnpm-workspace.yaml` / `turbo.json` / `lerna.json`), then enumerates packages. **The key decision: handle monorepos and standalone repos identically.** A monorepo expands its workspace globs; a standalone single-package repo (like the sibling app) is treated as a one-package workspace whose root *is* the package. That's why the same engine indexes a Turborepo and a plain Vite app with zero special-casing — the rest of the pipeline never knows which it got.

### 3.2 Macro pass — the skeleton, for free

[`macro-nodes.ts`](../tools/code-indexer/src/engine/structural/macro-nodes.ts) emits the `repo` node, an `app`/`package` node per workspace member, `contains` edges down the tree, and `depends-on` edges **read straight from each `package.json`'s internal dependencies**. No parsing — package dependency structure is already declared, so I read the declaration rather than inferring it from imports. (Cross-*module* imports are recovered in the micro pass; cross-*package* dependency is a coarser, already-stated fact.)

### 3.3 Micro pass — symbols via the AST

[`micro-symbols.ts`](../tools/code-indexer/src/engine/structural/micro-symbols.ts) builds a **ts-morph `Project`**, adds each package's source globs (`src`, `components`, `server`, `app`, `lib`, excluding `.d.ts` and `node_modules`), and walks every file to emit `file`/`folder`/`component`/`function` nodes and `imports`/`renders`/`references` edges. Folders are materialised on demand so the containment chain is complete.

### 3.4 Why ts-morph

The options were regex, Babel, or the TypeScript compiler API (raw or via ts-morph).

- **Regex** is a non-starter for "does this function return JSX" or "what does this import resolve to" — you'd be writing a bad parser.
- **Babel** parses well but doesn't *resolve* — it can't tell you what a symbol binds to across files.
- **Raw TS compiler API** can do everything but is famously low-level and verbose.

**ts-morph** is a thin, ergonomic layer over the real TypeScript compiler, so I get genuine type-aware resolution (the same engine the IDE uses) with a navigable API. For a tool whose entire value is *accuracy about TypeScript*, using TypeScript's own compiler is the only defensible choice. The `Project` is configured for bundler module resolution and React JSX so it reads modern apps correctly.

### 3.5 Component detection — a heuristic, named as such

A symbol is classified `component` vs `function` by a deliberate heuristic ([`detect-components.ts`](../tools/code-indexer/src/engine/structural/detect-components.ts)): **PascalCase name + in a `.tsx` file + returns JSX.** All three must hold.

This is a heuristic, not a proof, and I'd rather be explicit about that than pretend it's exact. It correctly catches the overwhelming majority of real React components and rejects ordinary helpers. It will mislabel the rare PascalCase non-component factory, and it won't catch a component written in a `.ts` file (vanishingly rare, and arguably a lint smell anyway). I chose a legible, fast rule over a heavier data-flow analysis because the failure mode is a single mislabeled node in a 200-node graph — cheap and obvious — not a correctness hazard.

### 3.6 Status enrichment — a separate, progressive pass

Node `status` (type errors, build health) is **not** computed during the structural index. It's a second pass ([`status/typecheck-runner.ts`](../tools/code-indexer/src/engine/status/typecheck-runner.ts)) that type-checks **per package** using that package's own `tsconfig`, then merges per-file results into the graph.

**Why decoupled:** structural indexing is fast (~1s for the app); a full type-check is slow and shouldn't block the first paint of the graph. So the server ships the structural graph immediately and enriches status **progressively** in the background, emitting a patch per package as each finishes. The runner deliberately **ignores TS2307** (cannot-find-module) because in a monorepo an unbuilt sibling's missing `dist` would otherwise mark a healthy package "broken" — that's environmental noise, not a real error.

---

## 4. Schema-first: the graph is a contract

The node/edge/snapshot/status schemas live in their **own package**, `@repo/code-graph-core`, as **Zod** schemas with types inferred from them. This isn't incidental — it's the spine:

- The engine produces snapshots that satisfy the schema; the server and any consumer validate against the same definitions. There's one source of truth for "what a graph is."
- `readSnapshot` **parses** `.code-graph/graph.json` with `GraphSnapshot.parse` ([`incremental/cache.ts`](../tools/code-indexer/src/engine/incremental/cache.ts)) — a snapshot from disk is validated, not trusted, so a stale or hand-edited file fails loudly instead of corrupting a consumer.
- Putting the contract in a leaf package with no dependencies but `zod` means the engine, the server, and the MCP layer all agree without any of them depending on each other.

This is the same "validate at the edges, infer types from schemas" discipline the sibling app uses — applied to a graph instead of an API.

---

## 5. Three surfaces, one engine

The engine is consumed three ways, and crucially they all call the **same** `IndexerSession` — there is no second implementation to drift:

- **CLI** (`cli.ts`) — one-shot `index --root <path>`, writes `.code-graph/graph.json`.
- **HTTP + WebSocket server** (`apps/indexer-server`) — indexes on boot, serves `GET /api/graph`, `GET /api/node/:id`, `POST /api/reindex`, and pushes live updates over `WS /ws`.
- **MCP server** (`server.ts`) — exposes `index_repo` / `get_graph` / `get_node` as Model Context Protocol tools, so an agent (Claude, Cursor) navigates the graph instead of re-reading files.

### 5.1 Live updates as patches, not rebuilds

The server watches the repo with `@parcel/watcher` ([`watcher.ts`](../apps/indexer-server/src/watcher.ts)), debounced 250 ms. On a change it maps the touched files to their owning **package**, re-type-checks just that package, and emits a **`GraphPatch`** (`upsertNodes` / `removeNodeIds` / …) over WebSocket. **Why a patch and not a re-index:** a client (or an agent) holding the graph should get a surgical delta — "these three nodes changed status" — not a full snapshot it has to diff itself. The structural graph is cheap enough to rebuild on demand via `POST /api/reindex`; the *hot path* (you saved a file) is incremental by design.

### 5.2 The knowledge layer — the graph as a retrieval index

Because the graph already knows every file/component/function and its location, it doubles as a retrieval index for natural-language questions ([`graph-service.ts`](../apps/indexer-server/src/graph-service.ts)): `askCodebase` ranks retrievable nodes by term overlap, reads the top few sources, and asks a **local Claude CLI** (haiku) to answer with citations back to node ids. **The design rule here is graceful degradation:** if no LLM is available, it returns the ranked node list as a heuristic answer instead of failing. The LLM is an enhancement on top of a graph that's useful on its own — never a hard dependency.

---

## 6. The monorepo split

Four packages, leaves first:

```
code-graph-core ─┬─▶ code-indexer ─▶ indexer-server
   _shared ──────┘     (engine + MCP)   (HTTP/WS + watcher)
```

- **`code-graph-core`** — the schema/contract (zod only). A leaf, fully unit-tested.
- **`_shared`** (`@tools/shared`) — the MCP server base (`McpServerBase`, `ToolRegistry`) and small utils, shared by any MCP tool.
- **`code-indexer`** — the engine (ts-morph analysis, discovery, status, knowledge), the CLI, and the MCP server.
- **`indexer-server`** — the Express + `ws` runtime and the file-watcher.

**Why split at all** rather than one package: the contract (`core`) has different change cadence and dependency weight than the engine, and the server is a deployment concern the engine shouldn't know about. The split lets `core` be a tiny dependency a consumer can adopt without pulling in ts-morph or Express. One implementation nuance worth knowing: `code-indexer` imports `_shared` by **relative path** (`../../_shared`), so the build compiles `_shared` into the engine's output — keeping the `tools/` layout intact is what makes that resolve.

---

## 7. Design decisions & trade-offs

The honest section.

1. **Static analysis only.** The graph is built from source, not from a running app or a bundler. So it doesn't know real bundle sizes, runtime call frequency, or dynamic `import()` targets resolved at runtime. The `bundleBytes` field exists in the schema for exactly this future enrichment; today it's null. Static was the right first cut — it's deterministic, fast, and needs no build.
2. **Component detection is a heuristic** (§3.5) — a legible rule over a heavy analysis, with a cheap, visible failure mode.
3. **Structure rebuilds fully; status is incremental.** The hot path (save → status patch) is surgical, but a structural change (new file) currently goes through `POST /api/reindex` rather than an incremental structural diff. Full structural reindex is ~1s here, so the complexity of incremental *structure* wasn't worth it yet — the schema's `GraphPatch` is already the right shape to make it incremental later.
4. **One in-memory snapshot per server.** The server holds a single graph for a single root. Multi-repo/multi-tenant would need a keyed store; out of scope for the tool's purpose.
5. **Root resolution is anchored to the repo root, not cwd.** An early version resolved a relative `--root`/`INDEXER_ROOT` against the process cwd, which silently indexed the wrong directory under `pnpm --filter` (the package dir). It now resolves against the repo root deterministically — the same path behaves identically however it's launched.
6. **`depends-on` is read from `package.json`, not inferred** (§3.2) — the declared truth over re-deriving a coarser fact from imports.
7. **The LLM is optional** (§5.2) — heuristic fallback always works; the AI is additive.

---

## 8. What I'd build next

- **Incremental structure** — turn a new/deleted file into a `GraphPatch` instead of a reindex, using the same patch path status already uses.
- **`calls` edges at symbol granularity** — the schema supports them; the current pass focuses on imports/renders.
- **Bundle enrichment** — populate `bundleBytes` from a real build, turning the graph into an impact-and-weight map.
- **Persisted knowledge/embeddings** — `NodeKnowledge` already has an `embeddingId` slot for semantic search over the graph.
- **A viewer** — the server serves JSON today; a small graph UI would make "see it" literal.

---

## Closing

The throughline mirrors the sibling app's: **one validated model, produced once, served many ways.** The graph schema is the contract; ts-morph gives it accuracy; the macro/micro split gives it altitude; and the CLI, server, and MCP are three doors into the same room. Everything optional — status, the LLM, live updates — degrades gracefully to a graph that's useful on its own.
