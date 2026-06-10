# CLAUDE.md — The Plan Beyond (repo root)

Context for AI agents and engineers working in this repo. Keep it short and true; update it when the shape of the repo changes.

## What this repo is

Two **independent** projects, each with its own install / build / test:

| Folder | What | Stack | Deep docs |
|---|---|---|---|
| [`app/`](app) | **The Plan Beyond** — the product. This build ships the **"My People"** feature (contacts, trustees, keyholders, Beyond Circle) to production depth. | React 19 · Vite · TS (strict) · Tailwind **v4** · RTK Query · Radix · Zod | [`app/README.md`](app/README.md), [`app/CLAUDE.md`](app/CLAUDE.md) |
| [`mcp-indexer/`](mcp-indexer) | A **code-intelligence engine** — indexes any TS/React repo into a queryable **code graph**, served over HTTP+WS, a CLI, and **MCP**. Its worked example is `app/`. | Turborepo · pnpm · ts-morph · Zod · Express · ws | [`mcp-indexer/README.md`](mcp-indexer/README.md), [`mcp-indexer/docs/DESIGN.md`](mcp-indexer/docs/DESIGN.md), [`mcp-indexer/CLAUDE.md`](mcp-indexer/CLAUDE.md) |

They do not share a `node_modules` or a lockfile. Run commands **inside the folder you mean** (`cd app` or `cd mcp-indexer`), or with `pnpm -C <dir>`.

## Prereqs

- **Node ≥ 20.19**, **pnpm 10** (both pin `pnpm@10.32.1` via `packageManager`; `corepack enable` selects it).
- Ports: app **5173** (web) + **3001** (mock API); indexer **3002** (server) + **5182** (web UI).

## Fastest path per project

```bash
# The app
cd app && pnpm install
pnpm dev          # web :5173 + mock API :3001
pnpm ci           # lint → typecheck → test:cov → build  (the full gate)

# The indexer
cd mcp-indexer && pnpm install && pnpm build
pnpm test         # turbo: schemas + engine + server + web
pnpm index:app    # index the sibling app → app/.code-graph/graph.json
pnpm serve:app    # live server on :3002, then `pnpm ui` for the 3D viewer
```

## Non-negotiables (read before editing)

- **The app's color palette is LOCKED.** Do not touch the token values in [`app/src/index.css`](app/src/index.css). Use the existing **semantic tokens** (`text-content`, `text-muted`, `text-faint`, `bg-surface`, `border-line`, `text-accent`, `text-danger`, …) — **never raw hex** in components. The `mcp-indexer` web UI palette is *not* locked.
- **Validate at the edge.** Never trust a payload — parse it with Zod first. Types are *inferred from* the schemas, not written twice.
- **TS strict + `noUncheckedIndexedAccess`** in both projects: an indexed access is `T | undefined`. Guard array/record lookups (`xs[0] ?? fallback`).
- One component per file, co-located `*.test.tsx`. `@/` import alias = `app/src`.

## Using the indexer as live context for Claude (recommended)

The `mcp-indexer` exists so an agent doesn't have to re-read the codebase to understand it. Register it once as an MCP server and you get three tools — `index_repo`, `get_graph`, `get_node` — that answer "what's here, what imports/renders/calls what, and what's downstream" from a typed graph instead of a grep sweep:

```bash
cd mcp-indexer && pnpm build
claude mcp add code-indexer -- node "$(pwd)/tools/code-indexer/build/code-indexer/src/index.js"
# then, in any session:  "index_repo on ../app, then get_node for file:src/App.tsx"
```

This CLAUDE.md is the **static** map (intent, conventions, locked constraints — things source can't tell you). The indexer is the **live** map (the actual structure, regenerated as you edit). They're complementary: read this first, query the graph for specifics.

## Deep context & memory → [`.claude/`](.claude/README.md)

This file is the quick map. The **detailed knowledge base** lives in
[`.claude/`](.claude/README.md) so you don't have to dig through the codebase each session:

- [`.claude/memory.md`](.claude/memory.md) — **start here.** Project memory: history,
  decisions, current branch state, in-flight work. The "what happened and why" log.
- [`.claude/architecture.md`](.claude/architecture.md) · [`app-overview.md`](.claude/app-overview.md)
  · [`data-layer.md`](.claude/data-layer.md) · [`ux-and-product.md`](.claude/ux-and-product.md)
  · [`conventions.md`](.claude/conventions.md) · [`testing.md`](.claude/testing.md)
  · [`runbook.md`](.claude/runbook.md) · [`glossary.md`](.claude/glossary.md)
  · [`indexer.md`](.claude/indexer.md)

When you make a meaningful change, **add a dated entry to `.claude/memory.md`** and update
the relevant deep-dive — treat these docs as code.

## Where to go next

- Working in the product → [`app/CLAUDE.md`](app/CLAUDE.md) (+ `.claude/app-overview.md`).
- Working on the indexer → [`mcp-indexer/CLAUDE.md`](mcp-indexer/CLAUDE.md) (+ `.claude/indexer.md`).
