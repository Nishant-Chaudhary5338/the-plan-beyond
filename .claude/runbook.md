# Runbook

Recipes for the common tasks, plus ports and troubleshooting. Paths are relative to `app/`
unless noted.

## Ports

| Service | Port | Start |
|---|---|---|
| App (web) | 5173 | `cd app && pnpm dev` |
| App (mock API) | 3001 | (started by `pnpm dev`) |
| App (e2e web) | 5174 | `pnpm e2e` (Playwright manages it) |
| Indexer server | 3002 | `cd mcp-indexer && pnpm serve:app` |
| Indexer 3D UI | 5182 | `cd mcp-indexer && pnpm ui` |

## Recipes

### Add a contacts API endpoint
1. Add it inside `contactsApi.injectEndpoints` with a Zod `transformResponse` and the
   right `providesTags` / `invalidatesTags`. Export the generated hook.
2. Implement the behavior in `api/contactsService.ts` (the shared logic).
3. Wire it in **both** transports: `server/index.ts` (Express) **and**
   `src/test/msw/handlers.ts` (MSW). Parity is mandatory.
4. Add an integration test that exercises it via MSW.

### Add a list filter
Extend `ContactFilters` + `DEFAULT_FILTERS` (`model/filters.ts`), teach the **one** codec
(`encodeFilters`/`decodeFilters`, with a guard for the new value), apply it in
`utils/filterContacts.ts`, and add the control to `list/SegmentFilters.tsx`. Add it to the
round-trip test. The type system forces you through every spot.

### Add a field to the Contact model
1. Add it to the relevant Zod schema in `model/types.ts` (type infers automatically).
2. Map it in **both directions** in `model/wire.ts` (`fromWireContact` / `toWireContact`).
   If the backend may not send it, make it optional and **omit** rather than fabricate.
3. Surface it in the right `detail/` section (use `OptionalField` if it's an optional text
   field so it collapses to "+ Add").
4. Update `mocks/seed.ts` if the demo data should show it.

### Add a UI primitive
Create it in `components/ui/`, wrap Radix if behavior/a11y matters, style with `cva` +
semantic tokens only, **export its `Props` type**, and add it to `components/ui/index.ts`.

### Add a whole feature
Create `src/features/<name>/` with the same layers (`api/ model/ hooks/ components/
pages/`), use `baseApi.injectEndpoints` for its data, and add a side-effect import in
`app/store.ts`. The store config itself stays untouched.

### Change what "ready" means (plan readiness)
Edit `planReadiness()` in `model/overview.ts` — one function, three steps. Keep the steps
concrete and verifiable from real `/people` signals (don't invent a metric).

## Indexer tasks

```bash
cd mcp-indexer && pnpm install && pnpm build
pnpm serve:app           # index ../app live on :3002 (then `pnpm ui` for the 3D view)
pnpm index:app           # one-shot → app/.code-graph/graph.json
# register as MCP for an agent:
claude mcp add code-indexer -- node "$(pwd)/tools/code-indexer/build/code-indexer/src/index.js"
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `pnpm` "no importer manifest found" | Wrong cwd. Run inside `app/` or `mcp-indexer/`, or `pnpm -C <abs-dir>`. |
| App passes tests but breaks in `pnpm dev` (or vice-versa) | Mock↔server parity drift — you changed one transport (`server/index.ts` vs `src/test/msw/`) but not the other. |
| "useBlocker must be used within a data router" in a test | A render path bypassed `renderWithProviders` (which uses a data router). Use the harness. |
| `getByRole(... /x/i)` finds 2 elements | An ⓘ added an "About X" button. Use an exact name in the query. |
| e2e reuses a *different* app / shows stale UI | A stale Vite server is squatting on the port. `lsof -ti :5174 :5173 | xargs kill -9`, then re-run. (Happened once with a sibling project on `:5174`.) |
| Indexer 3D UI can't reach the API | The server binds `127.0.0.1`; the Vite proxy must target `127.0.0.1:3002` (not `localhost`, which can resolve to `::1`). |
| `pnpm audit` crashes / weird lockfile errors | pnpm version mismatch. Use pnpm 10 (`pnpm@10.32.1` is pinned). |
| Coverage gate fails | Add a real test; don't add a coverage exclude. |

## Where the deep context is

- Memory / history → [`memory.md`](memory.md)
- App map → [`app-overview.md`](app-overview.md) · Data → [`data-layer.md`](data-layer.md)
- Product/UX → [`ux-and-product.md`](ux-and-product.md) · Standards → [`conventions.md`](conventions.md)
- Tests → [`testing.md`](testing.md) · Indexer → [`indexer.md`](indexer.md) · Terms → [`glossary.md`](glossary.md)
