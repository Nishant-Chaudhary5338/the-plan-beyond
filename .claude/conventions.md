# Conventions

Standards that the layout and the type system enforce. Match the surrounding code's
density and idiom; these are the non-obvious rules.

## The locked palette (app only)

- **Never change token values** in [`app/src/index.css`](../app/src/index.css) (`@theme`).
- **Never use raw hex in components.** Only semantic tokens:
  - Text: `text-content` (primary) · `text-muted` (secondary) · `text-faint` (tertiary).
  - Surfaces: `bg-surface` / the `.panel` utility · `bg-overlay` (dialogs/popovers).
  - Lines: `border-line` / `ring-line` · `ring-line-overlay`.
  - Status/brand: `text-accent` / `bg-accent` · `text-warning` · `text-danger` /
    `bg-danger-surface` / `ring-danger`.
  - Focus: `ring-ring`.
- Translucent layers use **explicit arbitrary opacity**: `bg-white/[0.08]`, `hover:bg-white/[0.07]`
  — *not* `bg-white/8`. Match existing classes.
- The `mcp-indexer` web UI palette is **not** locked (`apps/web/code-graph/src/lib/graph-style.ts`).

## Tailwind v4

- CSS-first config lives in `index.css` (`@theme`) via `@tailwindcss/vite`. **There is no
  `tailwind.config.js`.** Add tokens/utilities in `index.css`.

## TypeScript

- **Strict, including `noUncheckedIndexedAccess`** in both projects: an indexed access is
  `T | undefined`. Guard it — `xs[0] ?? fallback`, `'a#b'.split('#')[0] ?? ''`.
- **Types are inferred from Zod schemas**, never written twice (`z.infer<…>`).
- Escape hatches (`any`, `as any`, `@ts-ignore`, non-null `!`) are essentially absent —
  keep it that way. A non-null assertion must be provably safe and commented.
- `@/` import alias = `app/src`. The Express server and a few files it imports use
  relative paths (they run under `tsx`/Node, outside Vite's alias resolution).

## Files & components

- **One component per file**, co-located `*.test.tsx`. Components ≤ ~300 lines, hooks/
  functions small (component render bodies excepted).
- UI primitives are re-exported from `components/ui/index.ts`; import from
  `@/components/ui`. **Export each component's `Props` type** for extensibility.
- Comment the **why**, not the what — match the codebase's habit of explaining
  non-obvious decisions inline (see `SegmentFilters`, `useContactDraft`, `wire.ts`).

## Validation & data

- **Validate at the edge** — parse every payload / form / URL param / VCF with Zod before
  it flows inward.
- Map snake_case ↔ camelCase **only** in `model/wire.ts`.
- The list query string has **one codec** (`model/filters.ts`) shared by client + server +
  MSW. A new filter must be taught to the codec, `filterContacts`, and `SegmentFilters`.

## Indexer specifics

- Node schema is a **Zod discriminated union** — access variant fields via the exported
  guards `nodePath(node)` / `hasMetrics(node)` / `hasSpan(node)`, **not** `node.path`.
- `code-indexer` imports `_shared` by **relative path** and compiles it into its own
  output — keep the `tools/` layout intact.
- The indexer server binds **`127.0.0.1` only** (unauthenticated mutating + LLM endpoints).
- The LLM (knowledge summaries / chat) is **optional** — a heuristic fallback always
  works; never make it a hard dependency.

## The gate (run before you call something done)

```bash
# app
cd app && pnpm ci          # lint → typecheck → test:cov → build
cd app && pnpm e2e         # if you touched UI structure / a11y (needs chromium)

# indexer
cd mcp-indexer && pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

Coverage gates are enforced: `app/src/features/contacts/**` ≥ 80% stmts/fns/lines, 75%
branches; `app/src/lib/**` ≥ 85/80. They run in `pnpm ci` (via `test:cov`).

## Git / branches / commits

- Default branch `main`. Feature work on a branch (current: `improved-ux`).
- pnpm pinned to `pnpm@10.32.1` in both `package.json`s; CI uses the same.
- Commits are scoped and explanatory; do **not** add AI co-author trailers (the user has
  asked for these to be omitted). The two projects' build artifacts (`dist`, `build`,
  `coverage`, `.code-graph`, `.turbo`, `node_modules`) are gitignored — never commit them.
