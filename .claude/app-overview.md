# App Overview (`app/` — "My People")

The product is **The Plan Beyond**; this build ships the **"My People"** feature to
production depth: a relationship hub for managing trusted people, trustees, keyholders, and
your "Beyond Circle". ~101 source files, 24 test files.

Stack: **React 19 · Vite 7 · TypeScript (strict) · Tailwind v4 · RTK Query · Radix UI ·
React Hook Form + Zod · Sonner · Motion**. Routing: `react-router-dom` v7 data router.

## File-by-file orientation

```
app/
├── server/index.ts            Express mock API (dev). Wraps createContactsService.
├── src/
│   ├── main.tsx               entry
│   ├── App.tsx                RouterProvider
│   ├── index.css              Tailwind v4 @theme — the LOCKED design tokens
│   ├── app/                   composition root
│   │   ├── baseApi.ts         the ONE RTK Query createApi (tags: Contact, ContactList)
│   │   ├── store.ts           configureStore; features register via side-effect import
│   │   ├── routes.tsx         createBrowserRouter; lazy ContactsListPage/ContactDetailPage
│   │   ├── providers.tsx      ErrorBoundary(onError=reportError) → Redux → Tooltip → Toaster
│   │   └── hooks.ts           typed useAppDispatch / useAppSelector / useAppStore
│   ├── components/
│   │   ├── ui/                design-system primitives (see below) — barrel index.ts
│   │   └── layout/            AppShell, SideNav, TopBar, ErrorBoundary, RouteError, WipPlaceholder
│   ├── features/contacts/     THE feature (see data-layer.md + ux-and-product.md)
│   │   ├── api/               contactsApi (injected endpoints) · contactsService · apiError
│   │   ├── model/             types.ts (Zod) · wire.ts (ACL) · filters.ts (codec) ·
│   │   │                      contactsSlice.ts (UI state) · overview.ts · microcopy.ts · constants.ts
│   │   ├── hooks/             useContactDraft · useContactsQuery · useContactsStats ·
│   │   │                      useContactDeletion · useUnsavedGuard
│   │   ├── components/        list/ · detail/ · sidebar/ · add/ · import/
│   │   ├── utils/             vcfParser · filterContacts · alphabet
│   │   ├── mocks/             seed.ts (in-memory "DB") · googleMockContacts · addressSuggestions
│   │   └── pages/             ContactsListPage · ContactDetailPage
│   ├── lib/                   cn · phone · countries · format · id · deepEqual ·
│   │                          validators · reportError · useDebouncedValue
│   └── test/                  renderWithProviders · msw/{handlers,server} · setup
├── e2e/                       Playwright: contacts · add-contact · a11y (axe)
└── docs/                      ARCHITECTURE · API · DESIGN-SYSTEM · DECISIONS · TESTING · ENGINEERING-NOTES
```

## Design-system primitives (`components/ui/`, import from `@/components/ui`)

`Button · IconButton · Input · Textarea · DateInput · PhoneInput · Select · Checkbox ·
Switch · Field · Badge · Avatar · Spinner · Skeleton · EmptyState · FormErrorBanner ·
Dialog · ConfirmDialog · Popover · InfoPopover · Tooltip · Toaster (+ `toast`)`.

- Most wrap **Radix** where behavior/a11y matters (Dialog, Popover, Select, Switch,
  Tooltip) and add the project's styling + variants (via `cva`).
- They consume **only semantic tokens** — never raw hex. Prop types are exported.
- `InfoPopover` = the ⓘ affordance (44px target, keyboard-openable) used for in-context
  definitions. `Field` is the labelled-field render-prop wiring `htmlFor`/`aria-*`/errors.

## The contacts feature, mapped

### List page (`pages/ContactsListPage.tsx`)
- **Left sidebar** (`sidebar/`): `TrusteesCard`, `KeyholdersCard`, `BeyondCircleCard`,
  driven by the `/people` overview aggregate (`model/overview.ts`). `StatusLine` =
  dot + reassuring copy. `InviteTrusteeDialog` for the trustee-invite flow.
- **Right panel** (`list/ContactsPanel.tsx`): search (debounced), `SegmentFilters`
  (Groups / Beyond Circle / Emergency / Relationships menus + ⓘ), `AlphabetIndex` (A–Z;
  empty letters dimmed), `SortMenu`, `ContactsTable`/`ContactRow`, `ContactsPagination`,
  bulk-select + bulk-delete action bar. Distinct loading / empty / error states.
- Selection state lives in the slice and **clears on page/filter/search change**.

### Detail page (`pages/ContactDetailPage.tsx`)
Composes `detail/` sections in a two-column grid (natural heights, `items-start`):
- `ContactDetailHeader` — avatar, name, read-only role chips + meta line, Invite action,
  delete in a ⋯ overflow menu.
- `ContactInfoCard` — phones (set Identifier / add / remove) + emails; Identifier ⓘ.
- `RolesSettingsSection` — Emergency / Beyond Circle toggles (consequence line + ⓘ; OFF
  confirms + Undo), Relationship select, Groups multiselect.
- `PersonalInfoSection` · `AddressSection` (+ "use another contact's address" picker) ·
  `ProfessionalSection` (collapsed by default) · `NotesSection`.
- `UnsavedChangesBar` — floating Discard/Save + "All changes saved" flash.
- Empty optional fields render as **"+ Add {label}"** (`detail/OptionalField.tsx`).

## The draft/save engine (the heart of the detail page)

`hooks/useContactDraft.ts`:
- Loads the contact via `useGetContactQuery`, keeps a **local editable draft**.
- Re-seeds the draft from server **only on first load / id change** (a background refetch
  or an optimistic rollback must never wipe in-progress edits — this was a real bug fixed).
- `isDirty` via structural `deepEqual(contact, draft)` (order-insensitive; `undefined`
  vs missing treated equal — *not* `JSON.stringify`).
- `save()` PUTs the whole draft and **reconciles** the draft to the server's canonical
  response on success; on failure it throws and the draft keeps the edits to retry.
- Exposes field/array helpers (`patch`, `patchAddress`, `addPhone`, `setIdentifier`, …).

`hooks/useUnsavedGuard.ts` — React Router `useBlocker` + `beforeunload`, gated on
`isDirty`. The detail page renders a confirm prompt when the blocker is `blocked`.

## Where to read more

- Data, schemas, endpoints, codec, parity → [`data-layer.md`](data-layer.md).
- Product vocabulary, UX brief, microcopy → [`ux-and-product.md`](ux-and-product.md).
- Standards, locked palette, Tailwind v4 → [`conventions.md`](conventions.md).
- Tests + harness → [`testing.md`](testing.md). Recipes → [`runbook.md`](runbook.md).
