# The Plan Beyond — submission

Two deliverables in one repo:

| Folder | What it is |
|---|---|
| [**`app/`**](app) | **The Plan Beyond** — a production-grade React 19 + Vite + TS + Tailwind v4 app. This build implements the **"My People"** feature (trusted contacts, trustees, keyholders, Beyond Circle) to production depth. → [app/README.md](app/README.md) |
| [**`mcp-indexer/`**](mcp-indexer) | A reusable **code-intelligence engine** I built — indexes any TypeScript/React repo into a queryable code graph and serves it over HTTP, a CLI, and MCP. Its worked example is the app in `app/`. → [mcp-indexer/README.md](mcp-indexer/README.md) |

> *The Plan Beyond* is the product; *My People* is the feature implemented here. The two folders are independent projects — each has its own install, build, and test.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node ≥ 20.19** (LTS 20 or 22 recommended) | `node -v` to check |
| **pnpm 8** | Easiest: `corepack enable` — both projects pin `pnpm@8.15.6` via `packageManager`, so Corepack (bundled with Node) auto-selects the right version. Or install manually: `npm i -g pnpm@8`. |
| **Free ports** | App: **5173** (web), **3001** (mock API), **5174** (e2e). Indexer: **3002**. |
| **Playwright browsers** (only for `pnpm e2e`) | `cd app && npx playwright install chromium` |

The two folders are **separate projects** — run `pnpm install` in each. The first indexer install compiles `@parcel/watcher`, which can take ~1 minute.

---

## Quickstart

**The app** (web on :5173, mock API on :3001):

```bash
cd app
pnpm install
pnpm dev          # → http://localhost:5173/contacts
pnpm run ci       # lint → typecheck → test → build  (use `run`; `pnpm ci` is reserved by pnpm)
```

**The indexer** — index the app into a live code graph:

```bash
cd mcp-indexer
pnpm install
pnpm build
pnpm serve:app    # → http://localhost:3002/api/graph   (live, file-watched)
# one-shot instead:  pnpm index:app
```

The indexer points at `../app` out of the box because the two folders are siblings here — no path juggling. See [mcp-indexer/README.md](mcp-indexer/README.md) for the CLI, HTTP/WS API, and how to connect it to Claude Code via MCP.

---

## Layout

```
the-plan-beyond/
├── app/            The Plan Beyond web app  (React 19 · RTK Query · RHF+Zod · Vitest · Playwright)
└── mcp-indexer/    Code-graph engine        (Turborepo · ts-morph · Zod · Express+ws · MCP)
```

Each folder is self-contained; there is intentionally **no** root workspace tying them together.
