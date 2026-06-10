# API

Base URL `/api` (Vite proxies to the Express mock on `:3001`; same-origin in prod).
All shapes are defined and validated by Zod in `src/features/contacts/model/types.ts`.

## Landing-page aggregate (matches the live app)

On mount, the contacts page loads a single **`GET /people`** aggregate. The mock
mirrors the real shape:

```jsonc
{
  "contacts": { "total": 30, "items": [
    { "id", "name", "phone", "email", "image_url",
      "roles": ["notify"|"emergency"], "relationships": [], "groups": [],
      "share_after_death": true, "usage_count": 0 } ] },
  "trustees":   { "active_count", "pending_count", "max_allowed", "status": "at_risk" },
  "keyholders": { "accepted_count", "confirmed_event_count", "pending_count" },
  "notify_circle": { "enabled", "mode", "total_recipients" }   // = Beyond Circle
}
```

`share_after_death` ⇄ `isBeyondCircle`; `roles` carries `notify`/`emergency`. Schemas +
mapping live in `model/overview.ts`; the sidebar cards and header counts read it via
`useContactsStats`. The live app also fires `ui`, `account`, `family-ids`, `subscription`,
`milestones`, and `documents` on this route — out of scope here (WIP routes).

## Wire shape vs internal model (anti-corruption layer)

The live API speaks snake_case with a flatter contact shape (`first_name`,
`phone_list[]` with `is_primary`, `address_line_1/2`, top-level `company`/`job_title`,
`share_after_death`, `is_emergency_contact`, free-form `relationships`/`groups`). The app
keeps a clean camelCase internal model and maps at the boundary only —
`model/wire.ts` (`fromWireContact` / `toWireContact` / `toWireCreate` / `fromWireCreate`).
Components, store, and tests never see the wire shape.

- **Create**: `POST /contacts` body `{ first_name, last_name, phone_list:[{country_code, phone_number, is_primary}], share_after_death, is_emergency_contact }` → returns the full wire contact.
- **Edit**: `PUT /contacts/:id` with the editable subset (title, names, professional, address, relationships, groups, flags) → full wire contact.
- Relationship/group labels are free-form strings (the live app supports custom labels like "Brother"); `RELATIONSHIPS`/`GROUPS` are just preset suggestions.

> Live base path is `/api/v1`, with the aggregate at `/bff/web/people`. The mock uses
> `/api` + `/people`; point at the real host by setting `VITE_API_BASE_URL` (resolved in `app/baseApi.ts`).

## Contacts CRUD endpoints (mock)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/contacts` | — (query params below) | `{ items: Contact[], total }` |
| GET | `/contacts/:id` | — | `Contact` |
| POST | `/contacts` | `CreateContactInput` | `Contact` (201) |
| PATCH | `/contacts/:id` | `Partial<Contact>` | `Contact` |
| DELETE | `/contacts/:id` | — | `{ id }` |
| POST | `/contacts/import/vcf` | `{ contacts: CreateContactInput[] }` | `{ imported, skipped }` |
| POST | `/contacts/import/google` | `{ contacts: CreateContactInput[] }` | `{ imported, skipped }` |
| POST | `/__reset` | — | `{ ok: true }` (test-only, re-seeds) |

### List query params

`search`, `sort` (`name-asc`\|`name-desc`\|`recent`\|`oldest`), `letter` (A–Z),
`relationship`, `beyondCircle`/`emergency` (`on`\|`off`), `groups` (repeatable),
`page`, `pageSize`.

## Errors

`{ message: string }` with HTTP status:

- `400 Request validation failed` — missing first name or invalid phone (shown in the Add Contact banner).
- `409 A contact with this number already exists` — duplicate E.164 number.
- `404 Contact not found`.

## Types (abridged)

```ts
CreateContactInput = { firstName; lastName?; countryCode: "+NN"; phone: string }

Contact = {
  id; title?; firstName; middleName; lastName;
  dateOfBirth?; anniversary?;
  phones: { id; countryCode; number; e164; isIdentifier }[];
  emails: { id; email }[];
  address: { flat; street; city; state; postalCode; country };
  professional: { nickname; company; jobTitle; website };
  notes; relationship?; groups[]; isEmergencyContact; isBeyondCircle; createdAt;
}
```

## Swapping in the real backend

Point `fetchBaseQuery`'s base at the real host (or keep `/api` and proxy), then
reconcile field names in `model/types.ts` against the live network payloads. The
RTK Query endpoints and Zod schemas are the only files that need to change.
