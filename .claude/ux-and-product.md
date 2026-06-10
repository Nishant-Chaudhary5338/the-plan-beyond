# UX & Product

## What "The Plan Beyond" is

An end-of-life / legacy planning product. "My People" is the relationship hub: who you
trust, who can act for you, and who is reached or given access after a triggering life
event. The emotional register matters — this is used on hard days.

**Tone test for any copy**: *"would this read okay on the hardest day of someone's life?"*
Warm, plain, finishable. No alarm, no jargon, no dead ends.

## Product vocabulary (memorize these — they drive the model)

| Term | Meaning | Model |
|---|---|---|
| **Trustee** | Someone you trust to act on your behalf if you can't. | Aggregate server status (`/people.trustees`) |
| **Keyholder** | Holds access to a specific thing — a document, photo, message — released when an event happens. | Aggregate server status (`/people.keyholders`) |
| **Beyond Circle** | People reached or given access after a triggering life event. | **Per-contact boolean** (`isBeyondCircle`, wire `share_after_death`) + aggregate `notify_circle` |
| **Emergency** | Reached first, immediately, in an urgent situation. | **Per-contact boolean** (`isEmergencyContact`) |
| **Identifier** | The phone an invited person's account is matched to. Reassign with the star. | `phone.isIdentifier` |

The single source of truth for all definitions / consequence lines / confirm copy is
[`app/src/features/contacts/model/microcopy.ts`](../app/src/features/contacts/model/microcopy.ts).
The list-page ⓘ popovers, the detail-page toggle consequence lines, and the OFF-toggle
confirms all read from it so wording **cannot drift** between pages.

## The UX brief implementation (branch `improved-ux`)

A detailed brief was implemented (Waves 1–3 + 5). The principles, not just the items:

- **Color is never the only signal.** Status uses a dot **plus** words (`StatusLine`).
  "At risk" was retired for warm, finishable copy.
- **In-context vocabulary.** ⓘ definitions next to Trustees / Keyholders / Beyond Circle /
  Emergency, and consequence lines under the detail toggles. Same copy both places.
- **No silent or accidental data loss.**
  - Explicit Save/Discard; a navigation guard (`useUnsavedGuard`) on unsaved edits; an
    "All changes saved" confirmation in the bar.
  - Turning a role **OFF** is consequential → quiet confirm naming what it removes + an
    **Undo** toast. Turning **ON** is instant.
  - Delete lives in a ⋯ overflow menu, away from the primary Invite action.
- **Progressive disclosure.** Empty optional fields collapse to "+ Add {label}"
  (`OptionalField`); the Professional section is collapsed by default.
- **Honest readiness, not a vanity metric.** `planReadiness()` (in `model/overview.ts`)
  derives a 0–100 from three real `/people` signals (people added · a trustee named ·
  Beyond Circle set up) with concrete, completable steps — *no invented score*.

### Decisions captured
- **A4** (Beyond Circle column): chose **Option A** — read-only, legible symmetric On/Off
  pills. No inline write path in the table.
- **A6** (plan readiness): the brief flagged it "blocked on a product definition of
  ready." It's now answered honestly via `planReadiness()` (3 verifiable steps). If you
  change what "ready" means, change that one function.

## Hard product constraints (don't "fix" these)

- **Single relationship** per contact (the detail form is single-select). The wire carries
  `relationships[]`; we map `[0]`.
- **Invite flow is mostly a placeholder.** Build no invite UI (pre-send sheet, status
  chip beyond "Not yet invited", resend/revoke) until invites actually ship. The model now
  *carries* an optional `invite` status but the UI only reflects what the backend sends.
- **Explicit save, never per-field autosave** on the detail page.
- Several sidebar "Manage …" actions and the product "Invite to The Plan Beyond" button
  are intentionally **out of scope** stubs (a toast/TODO, not dead buttons).

## Accessibility is a requirement, not polish

- Text ramp meets **WCAG AA ≥ 4.5:1** on every surface it's used on (the danger and
  neutral-badge tokens were specifically lightened to clear this).
- Global `:focus-visible` ring (`ring-ring`); `prefers-reduced-motion` honored globally;
  `aria-live` on the save bar and undo; filter menus are real `role="menu"` /
  `menuitemradio` with arrow-key nav; the A–Z rail skips empty letters.
- **Playwright runs `@axe-core`** on the list and detail pages (chromium + mobile) and
  asserts zero violations. Don't regress this — run `pnpm e2e` if you touch UI structure.
