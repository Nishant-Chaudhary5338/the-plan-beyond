# Indexer (`mcp-indexer/`)

A reusable **code-intelligence engine**: it indexes any TypeScript/React repo into a
queryable **code graph** and serves it over **HTTP+WS**, a **CLI**, and an **MCP server**,
plus a **3D web viewer**. Its worked example is the sibling `app/`.

> The authoritative, detailed map is [`mcp-indexer/CLAUDE.md`](../mcp-indexer/CLAUDE.md)
> (kept current and thorough). This page is just orientation + how it relates to the app.

## At a glance

```
mcp-indexer/
├── packages/code-graph-core/   the contract — Zod schemas + ids + guards (zod-only leaf)
├── tools/_shared/              MCP server base, ToolRegistry, utils (relative-imported)
├── tools/code-indexer/         the engine: ts-morph analysis, CLI, MCP server
└── apps/
    ├── indexer-server/         Express + ws runtime, file-watcher, routes  (:3002)
    └── web/code-graph/         React + react-force-graph-3d viewer         (:5182)
```

## Commands

```bash
cd mcp-indexer && pnpm install && pnpm build   # topo build (build before CLI/server/MCP)
pnpm serve:app     # index ../app live on :3002, WS pushes on edits
pnpm ui            # 3D viewer on :5182 (proxies /api + /ws → 127.0.0.1:3002)
pnpm index:app     # one-shot snapshot → app/.code-graph/graph.json
pnpm test          # schemas + engine (vitest) + server (node:test)
```

## The model in one line

Nodes `repo · app · package · folder · file · component · function` (Zod **discriminated
union** — use `nodePath`/`hasMetrics`/`hasSpan` guards, not direct field access); edges
`contains · imports · references · renders · calls · depends-on`. Component-vs-function is
a heuristic (PascalCase + `.tsx` + returns JSX). The semantic pass (renders/calls) is
**conservative** — an edge is emitted only when the target resolves to a real indexed node.

## Hot path (live edits)

The watcher debounces ~250ms, then `session.reparseFiles` re-extracts the changed files
**plus one hop of importers**, re-runs the semantic pass, re-type-checks affected packages,
and emits a reconciled `GraphPatch` over WS. Full rebuild via `POST /api/reindex`.

## Things that bite

- **Build first.** The server runs via `tsx` but imports the *compiled* engine; the CLI/MCP
  are compiled JS. Run `pnpm build` before `serve`/`index`/MCP.
- **Server binds `127.0.0.1` only** (unauthenticated mutating + LLM endpoints). The 3D UI
  proxy must target `127.0.0.1`, not `localhost`.
- **The LLM is optional** — heuristic fallbacks always work; never a hard dependency.
- The **web UI palette is NOT locked** (unlike `app/`): `apps/web/code-graph/src/lib/graph-style.ts`.

## Using it as live context for an agent

```bash
cd mcp-indexer && pnpm build
claude mcp add code-indexer -- node "$(pwd)/tools/code-indexer/build/code-indexer/src/index.js"
# then: "index_repo on ../app, then get_node for file:src/App.tsx"
```

`CLAUDE.md` files = the static map (intent/conventions). The indexer = the live map (actual
structure, regenerated as you edit). Read the docs first, query the graph for specifics.
