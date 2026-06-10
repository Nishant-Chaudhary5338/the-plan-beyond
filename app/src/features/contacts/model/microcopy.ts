/**
 * Single source of truth for the people/detail microcopy (UX brief §C).
 *
 * The list-page ⓘ popovers (A2), the detail-page toggle consequence lines (B2),
 * and the off-toggle confirms (B3) all read from here so the wording can never
 * drift between the two pages.
 *
 * Tone test for any change: would this read okay on the hardest day of
 * someone's life?
 */

export interface RoleDefinition {
  /** Plain one-sentence definition. */
  definition: string;
  /** A concrete example that grounds the definition. */
  example: string;
}

export const ROLE_DEFINITIONS = {
  trustee: {
    definition: 'Someone you trust to act on your behalf if you can’t. They can step in when it matters most.',
    example: 'Example: a partner or sibling who can manage your plan if you’re unable to.',
  },
  keyholder: {
    definition: 'Holds access to a specific thing — a document, photo, or message — released when an event happens.',
    example: 'Example: a friend who receives a letter you’ve left, only once it’s time.',
  },
  beyondCircle: {
    definition: 'People reached or given access after a triggering life event.',
    example: 'Example: close family who are notified and given what you’ve chosen to share.',
  },
  emergency: {
    definition: 'Reached first, immediately, in an urgent situation.',
    example: 'Example: the person called the moment something urgent happens to you.',
  },
} as const satisfies Record<string, RoleDefinition>;

/** One-line consequence shown beneath the detail-page role toggles (B2). */
export const TOGGLE_CONSEQUENCE = {
  emergency: 'Reached first, immediately, if something urgent happens to you.',
  beyondCircle: 'Included in what’s shared or unlocked after a triggering life event.',
} as const;

/** Confirm copy when a consequential role is turned OFF (B3). */
export const OFF_TOGGLE_CONFIRM = {
  beyondCircle: (name: string) =>
    `Remove ${name} from your Beyond Circle? They’ll no longer receive anything after a triggering event. You can re-add them anytime.`,
  emergency: (name: string) =>
    `Remove ${name} as an emergency contact? They won’t be reached first in an urgent situation. You can re-add them anytime.`,
} as const;

/** Save-bar status copy (B4). */
export const SAVE_STATUS = {
  saving: 'Saving…',
  saved: 'All changes saved',
} as const;
