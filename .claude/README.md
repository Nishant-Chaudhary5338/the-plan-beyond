# `.claude/` — Knowledge Base & Memory

This directory is the **durable context** for The Plan Beyond monorepo: everything an
engineer or an LLM needs to be productive in a fresh session **without** re-reading the
whole codebase. Read the file that matches your task; each is self-contained.

> The hierarchical `CLAUDE.md` files (repo root, `app/`, `mcp-indexer/`) are the
> auto-loaded *quick maps*. The files here are the *deep dives* they point to. When
> something here conflicts with source, **source wins** — and you should update the doc.

## Map of this knowledge base

| File | When to read it |
|---|---|
| [`memory.md`](memory.md) | **Start here.** Running project memory: history, decisions, current branch state, open threads. The "what happened and why" log across sessions. |
| [`architecture.md`](architecture.md) | The system: two projects, data flow, how the app and indexer fit together. |
| [`app-overview.md`](app-overview.md) | The product app (`app/`): feature map, file-by-file orientation, the draft/save engine, layout. |
| [`data-layer.md`](data-layer.md) | The Contact model, the wire/anti-corruption layer, RTK Query endpoints + cache tags, the filters codec, the `/people` overview, mock↔server parity. |
| [`ux-and-product.md`](ux-and-product.md) | Product vocabulary (Trustee / Keyholder / Beyond Circle / Emergency), the UX brief implementation, shared microcopy, what's intentionally **not** built. |
| [`conventions.md`](conventions.md) | Coding standards: the **locked** color palette, Tailwind v4, TS strictness, file/size rules, commit/PR norms. |
| [`testing.md`](testing.md) | Test strategy, the data-router harness, coverage gates, e2e + axe, how to add tests without flakiness. |
| [`runbook.md`](runbook.md) | Recipes: add an endpoint / a filter / a contact field / a UI primitive; run, debug, ports, troubleshooting. |
| [`glossary.md`](glossary.md) | Domain + technical terms, one-liners. |
| [`indexer.md`](indexer.md) | The `mcp-indexer` code-intelligence engine: engine, server, 3D UI, MCP usage. |
| [`settings.json`](settings.json) | Harness permissions allowlist (read-only/dev commands pre-approved). |

## The five things that bite people first

1. **Two independent projects.** `app/` and `mcp-indexer/` have separate installs,
   lockfiles, and `node_modules`. Run commands inside the right folder (`cd app` /
   `cd mcp-indexer`) or with `pnpm -C <dir>`.
2. **The app's color palette is LOCKED.** Never change token values in
   `app/src/index.css`; never use raw hex in components — only semantic tokens.
3. **Validate at the edge.** Everything crossing the wire is parsed by Zod; types are
   *inferred from* schemas, not written twice.
4. **Mock ↔ server parity.** `app/server/index.ts` (Express, dev) and `app/src/test/msw/`
   (tests) must implement the same endpoints, or the app passes tests but breaks in `dev`.
5. **No silent data loss on the detail page.** Local draft + explicit Save/Discard +
   navigation guard + Undo toasts. Do **not** introduce per-field autosave.

## Keeping this current

When you make a meaningful change (new feature, new convention, a decision worth
remembering, a non-obvious fix), add a dated entry to [`memory.md`](memory.md) and update
the relevant deep-dive. Treat these files as code: small, true, reviewed.
