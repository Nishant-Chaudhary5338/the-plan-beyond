# CLAUDE.md — app/ (The Plan Beyond · "My People")

Operational map for this app. For the full narrative see [`README.md`](README.md); this is the "don't be clueless" cheat sheet.

> **Deep dives + project memory** live in [`../.claude/`](../.claude/README.md):
> [`memory.md`](../.claude/memory.md) (history/decisions), [`app-overview.md`](../.claude/app-overview.md),
> [`data-layer.md`](../.claude/data-layer.md), [`ux-and-product.md`](../.claude/ux-and-product.md),
> [`conventions.md`](../.claude/conventions.md), [`testing.md`](../.claude/testing.md),
> [`runbook.md`](../.claude/runbook.md). Read those for depth; update them when you change things.

## Commands

```bash
pnpm dev        # web :5173 + mock Express API :3001 (concurrently)
pnpm web        # vite only (uses MSW for data — no API process)
pnpm test       # vitest run        ·  pnpm test:watch  ·  pnpm test:cov
pnpm e2e        # playwright (needs: npx playwright install chromium)
pnpm typecheck  # tsc -b --noEmit
pnpm lint       # eslint .          ·  pnpm lint:fix
pnpm ci         # lint → typecheck → test:cov → build   ← the gate to pass before done
```

## Architecture in one breath

`React 19 + Vite + Tailwind v4`. Data via **RTK Query** (`src/app/baseApi.ts`) against either the **Express mock** (`server/index.ts`, dev) or **MSW** (tests / `pnpm web`) — the two are kept at **parity** so the app behaves identically. Routing is `react-router-dom` v7 (`src/app/routes.tsx`). Forms are local-draft + explicit save (no autosave). Everything crossing the wire is **Zod-parsed**.

## Where things live

```
src/
├── app/              store.ts · baseApi.ts · routes.tsx · providers.tsx · hooks.ts
├── components/
│   ├── ui/           design-system primitives (Button, Field, Input, Select, Dialog,
│   │                 Popover, Switch, Avatar, PhoneInput, InfoPopover, ConfirmDialog…)
│   │                 → re-exported from components/ui/index.ts; import from '@/components/ui'
│   └── layout/       app shell / nav
├── features/
│   └── contacts/     THE feature ("My People")
│       ├── api/      contactsApi (RTK Query endpoints) · contactsService
│       ├── components/  detail/ (ContactDetailPage parts) · list/ · sidebar/ · import/
│       ├── hooks/    useContactDraft (the draft+dirty engine) · useUnsavedGuard · useContactsStats
│       ├── model/    types.ts (Zod schemas) · overview.ts · microcopy.ts · filters.ts
│       ├── mocks/    seed data + address suggestions
│       └── pages/    ContactDetailPage · ContactsListPage
├── lib/              cn · phone · format · validators · id · deepEqual · useDebouncedValue
└── test/             renderWithProviders · msw handlers · setup
```

## The feature, mapped

- **Detail page** = [`pages/ContactDetailPage.tsx`](src/features/contacts/pages/ContactDetailPage.tsx) composing `detail/` sections: `ContactDetailHeader`, `ContactInfoCard` (phones/emails + Identifier), `RolesSettingsSection` (Emergency / Beyond Circle toggles + groups), `PersonalInfoSection`, `AddressSection`, `ProfessionalSection` (collapsed by default), `NotesSection`, `UnsavedChangesBar`.
- **Edit model**: [`hooks/useContactDraft.ts`](src/features/contacts/hooks/useContactDraft.ts) owns a local draft, tracks `isDirty` via `deepEqual`, and only re-seeds from server on first load / id change (a background refetch must never wipe edits). Save reconciles to the server's canonical response. `useUnsavedGuard` blocks navigation while dirty.
- **List page** = `pages/ContactsListPage.tsx` → `list/` (PeopleHeader, SegmentFilters, AlphabetIndex, ContactsTable/Row, pagination) + `sidebar/` (TrusteesCard, KeyholdersCard, BeyondCircleCard — driven by the `/people` overview aggregate, see `model/overview.ts`).

## Conventions & gotchas

- **Colors are LOCKED** — never edit token values in [`src/index.css`](src/index.css); never use raw hex in components. Only semantic tokens: `text-content / text-muted / text-faint`, `bg-surface / panel`, `border-line`, `text-accent`, `text-danger / bg-danger-surface`, focus ring `ring-ring`.
- **Tailwind v4** (CSS-first config in `index.css`, `@tailwindcss/vite`) — there is no `tailwind.config.js`. Prefer explicit arbitrary opacity (`white/[0.08]`, not `white/8`) for consistency with existing classes.
- **Tone test for any copy**: "would this read okay on the hardest day of someone's life?" Shared microcopy lives in [`model/microcopy.ts`](src/features/contacts/model/microcopy.ts) so list and detail never drift.
- **a11y is a requirement, not polish**: text ramp meets WCAG AA ≥4.5:1, global `:focus-visible` ring, `prefers-reduced-motion` honored, `aria-live` on save/undo. Playwright runs `@axe-core`. Don't regress this.
- **No silent data loss** — explicit Save/Discard, navigation guard, Undo toasts on destructive toggles.
- One component/file, co-located `*.test.tsx`, components ≤300 lines, hooks ≤50, `@/` = `src`.

## Mock ↔ server parity

`server/index.ts` (Express, dev) and `src/test/msw/` (tests) implement the **same** endpoints. If you add/alter an endpoint, change **both**, or the app passes tests but breaks in `pnpm dev` (and vice-versa).
