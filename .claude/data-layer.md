# Data Layer

This is the part you swap when wiring a real backend. It is deliberately one folder of
schemas + mappers plus one shared service.

## The internal model (`model/types.ts`)

Zod schemas; **types are inferred** (`type Contact = z.infer<typeof contactSchema>`), never
hand-written. The clean domain model is camelCase. Key shapes:

- `Contact` — `id, title?, firstName, middleName, lastName, dateOfBirth?, anniversary?,
  phones[], emails[], address, professional, notes, relationship?, groups[],
  isEmergencyContact, isBeyondCircle, avatarUrl?, createdAt`, plus an optional
  `invite?: { status: 'not_invited' | 'invited' | 'joined', invitedAt?, joinedAt? }`
  (product-invite standing; **absent when the backend doesn't send it** — the UI never
  fabricates an invite status).
- `Phone` — `id, countryCode (+NN), number (national), e164 (canonical), isIdentifier,
  phoneType?, label?, …`. **`e164` is the dedup key.**
- `CreateContactInput` — `firstName, lastName, countryCode, phone` (the Add form). Note:
  `firstName`/`lastName` are `.trim()`-ed in the schema so client and server agree.

## The anti-corruption layer (`model/wire.ts`)

The live API speaks snake_case; the app speaks camelCase. **All mapping happens here,
only at the boundary.**

- `fromWireContact(w)` → `Contact`. Canonicalizes each phone's E.164 via
  `canonicalizePhone` (falling back to wire-provided forms so a real backend's unusual
  number is never discarded). Maps `relationships[0]` → `relationship` (single-select by
  product decision). Reads optional `invite_status`/`invited_at`/`joined_at` into `invite`.
- `toWireContact(c)` / `toWireCreate(input)` → wire bodies.
- `wireContactSchema` is `.passthrough()` — unknown wire fields don't break parsing.

> If a real backend's shapes differ, change **only** these mappers. The rest of the app
> never sees snake_case.

## RTK Query (`api/contactsApi.ts` injecting `app/baseApi.ts`)

One `baseApi` (`createApi`, base URL from `VITE_API_BASE_URL` ?? same-origin `/api`, tags
`Contact` + `ContactList`). Endpoints:

| Endpoint | Method | Notes |
|---|---|---|
| `getPeopleOverview` | GET `/people` | sidebar aggregate; provides `ContactList/LIST` |
| `getContacts` | GET `/contacts?…` | provides **only** `ContactList/LIST` (per-item tags were intentionally dropped — nothing invalidates an individual contact) |
| `getContact` | GET `/contacts/:id` | provides `{Contact, id}` |
| `createContact` | POST | invalidates `ContactList/LIST` |
| `updateContact` | PUT | **optimistic**: full-value replace of `getContact` cache, patch to the server response on success, `undo()` on failure; invalidates only `ContactList/LIST` (NOT `{Contact,id}` — that would refetch and defeat the optimistic update) |
| `deleteContact` | DELETE | invalidates `ContactList/LIST` |
| `inviteTrustee` | POST `/trustees/invite` | |
| `importVcf` / `importGoogle` | POST | bulk import |

Every response is parsed by Zod in `transformResponse` (via `parseWire` =
`fromWireContact(wireContactSchema.parse(raw))`). A malformed payload fails loudly at the
edge. `api/apiError.ts` (`getApiErrorMessage`) surfaces server bodies **and** transport/
parse failures (`FETCH_ERROR` / `PARSING_ERROR`).

## The filter codec (`model/filters.ts`) — single source for the list query string

`ContactFilters` = `{ search, letter, groups[], relationship, beyondCircle, emergency,
sort, page, pageSize }`. `MAX_PAGE_SIZE = 100`.

- `encodeFilters(f)` → query string (omits defaults). `decodeFilters(params)` → filters,
  with **guards**: integers truncated + clamped (`page ≥ 1`, `pageSize ∈ [1,100]`), `sort`
  / tri-state validated against allowed values (a crafted `?sort=DROP TABLE` falls back).
- Used by the client (`useContactsQuery`), the Express server, and the MSW handlers — so
  a new filter can't be silently dropped by one side. There's a `decode(encode(f))`
  round-trip test.

## The shared service (`api/contactsService.ts`)

`createContactsService(seed?)` — in-memory CRUD + filter + dedup. **The one implementation
behind Express, MSW, and e2e.**
- `validateCreate` canonicalizes the phone and **dedups on canonical E.164** (so the same
  number with/without a trunk zero is one contact). Create and update share this.
- `overview()` returns the `/people` aggregate including **`available_letters`** (the A–Z
  initials that currently have ≥1 contact, for rail dimming) and `notify_circle`.
- `list(filters)` delegates to the pure `filterContacts` pipeline.

`filterContacts` (`utils/filterContacts.ts`) — pure filter → sort → paginate, shared by
all transports. `indexLetter` folds accents/stroke letters (`José`→J, `Łukasz`→L) and
buckets non-Latin under `#`.

## Mock ↔ server parity (do not break)

`server/index.ts` (Express, dev) and `src/test/msw/handlers.ts` (tests) both call the same
`createContactsService` and the same filter codec. **If you add or change an endpoint,
change both transports**, or the app passes tests but breaks in `pnpm dev` (and vice-versa).
The seed dataset (`mocks/seed.ts`) is deterministic so all environments agree.

## Phone canonicalization (`lib/phone.ts`)

- `canonicalizePhone(dialCode, national, region?)` → `{ countryCode, nationalNumber, e164 }
  | null`. Normalizes trunk prefixes and separators. **Acceptance gate is `isPossible()`,
  not `isValid()`** — so the project's own demo numbers (e.g. a UK Ofcom drama range) are
  accepted while true garbage is rejected.
- `canonicalizeFreeform(raw, defaultRegion)` for the VCF importer (varied formats).
- `toE164`, `isValidPhone`, `formatPhoneDisplay`. **This is the dedup-critical path** —
  it has dedicated tests; keep them green.
