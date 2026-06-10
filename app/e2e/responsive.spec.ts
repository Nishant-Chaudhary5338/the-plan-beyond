import { test, expect, type Page } from '@playwright/test';

/**
 * Deterministic responsive checks for the "My People" feature.
 *
 * Unlike the screenshot sweep (visual/my-people.spec.ts), these are real
 * pass/fail assertions that catch the gross responsive failures a static image
 * would show — without a human or AI looking at anything:
 *
 *   1. Horizontal overflow  — the page must not scroll sideways.
 *   2. Content spill         — no visible text/control extends past the right edge.
 *   3. Tap-target size       — interactive elements meet the WCAG 2.2 AA minimum.
 *   4. Fixed-nav overlap     — the mobile bottom bar must not cover the last row.
 *
 * The spec drives its own viewport sizes, so it only needs to run once. The
 * project guard below skips the duplicate run under the 'mobile' project.
 */

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

// WCAG 2.2 SC 2.5.8 (AA) minimum is 24x24 CSS px. Apple HIG / WCAG 2.5.5 (AAA)
// is 44x44 — raise this if you want the stricter bar (expect more failures).
const MIN_TAP_TARGET = 24;

const SCENARIOS = [
  {
    id: 'list',
    open: async (page: Page) => {
      await page.goto('/contacts');
      await expect(page.getByRole('heading', { name: 'My People' })).toBeVisible();
    },
  },
  {
    id: 'detail',
    open: async (page: Page) => {
      await page.goto('/contacts/seed-001');
      await expect(page.getByRole('heading', { name: /Amit Bansal/i })).toBeVisible();
    },
  },
  {
    id: 'add-modal',
    open: async (page: Page) => {
      await page.goto('/contacts');
      await page.getByRole('button', { name: 'Add Contact' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
] as const;

// ---- in-page measurement helpers -----------------------------------------

/** Pixels the document can scroll horizontally (0 = no sideways scrollbar). */
function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
}

/** Visible text/media/controls whose box extends past the viewport's right edge. */
function spillingElements(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const TOL = 2; // sub-pixel tolerance
    const offenders: Array<{ tag: string; cls: string; text: string; right: number; vw: number }> = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      // Fixed/sticky chrome (the nav) is allowed to span the viewport.
      if (style.position === 'fixed' || style.position === 'sticky') continue;
      const tag = el.tagName.toLowerCase();
      // Only flag elements that carry visible content: a leaf with text, or
      // media/controls. Wrapper divs that merely contain an offender are noise.
      const isLeafText = el.children.length === 0 && (el.textContent ?? '').trim().length > 0;
      const isContent = ['img', 'svg', 'button', 'a', 'input', 'select', 'textarea'].includes(tag);
      if (!isLeafText && !isContent) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < vw && r.right > vw + TOL) {
        offenders.push({
          tag,
          cls: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
          text: (el.textContent ?? '').trim().slice(0, 30),
          right: Math.round(r.right),
          vw,
        });
      }
    }
    return offenders.sort((a, b) => b.right - a.right).slice(0, 10);
  });
}

/** Enabled, visible interactive elements rendered below the minimum tap size. */
function smallTapTargets(page: Page, min: number) {
  return page.evaluate((min) => {
    const sel =
      'button, [role="button"], [role="switch"], [role="checkbox"], a[href], input:not([type="hidden"]), select, textarea';
    const TOL = 0.5;
    const offenders: Array<{ label: string; tag: string; w: number; h: number }> = [];
    for (const el of Array.from(document.querySelectorAll(sel))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // not laid out
      // Skip visually-hidden (sr-only) controls like skip links — they collapse
      // to ~1px until focused, then expand, so they aren't real tap targets.
      if (r.width <= 4 && r.height <= 4) continue;
      if (r.width + TOL < min || r.height + TOL < min) {
        offenders.push({
          label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30),
          tag: el.tagName.toLowerCase(),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    }
    return offenders;
  }, min);
}

// ---- tests -----------------------------------------------------------------

test.beforeEach(async ({ request }, testInfo) => {
  // Drives its own viewports — running under both projects would just duplicate.
  test.skip(testInfo.project.name === 'mobile', 'Runs once under the chromium project.');
  await request.post('/api/__reset');
});

for (const scenario of SCENARIOS) {
  for (const bp of BREAKPOINTS) {
    test(`${scenario.id} @ ${bp.name}: no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await scenario.open(page);
      const overflow = await horizontalOverflow(page);
      expect(overflow, `document scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(1);
    });

    test(`${scenario.id} @ ${bp.name}: no content spills past the right edge`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await scenario.open(page);
      const offenders = await spillingElements(page);
      expect(offenders, `elements past the ${bp.width}px edge: ${JSON.stringify(offenders, null, 2)}`).toEqual([]);
    });
  }
}

// Tap-target size is viewport-independent in this layout; mobile is the case
// that matters, so we check the list and detail pages at 375px.
for (const scenario of [SCENARIOS[0], SCENARIOS[1]]) {
  test(`${scenario.id} @ mobile: interactive elements meet the ${MIN_TAP_TARGET}px tap-target minimum`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await scenario.open(page);
    const offenders = await smallTapTargets(page, MIN_TAP_TARGET);
    expect(offenders, `under ${MIN_TAP_TARGET}px: ${JSON.stringify(offenders, null, 2)}`).toEqual([]);
  });
}

test('list @ mobile: the fixed bottom nav does not cover the last contact row', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/contacts');
  await expect(page.getByRole('heading', { name: 'My People' })).toBeVisible();

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

  // Scroll to the bottom, then measure both the nav and the last row in the
  // SAME coordinate space (viewport-relative getBoundingClientRect) so a fixed
  // element and a scrolled element are comparable.
  const m = await page.evaluate(() => {
    const scroller = document.scrollingElement ?? document.documentElement;
    scroller.scrollTop = scroller.scrollHeight;
    const nav = document.querySelector('nav[aria-label="Primary"]');
    const rows = document.querySelectorAll('table tbody tr');
    const last = rows[rows.length - 1];
    if (!nav || !last) return null;
    const n = nav.getBoundingClientRect();
    const r = last.getBoundingClientRect();
    return { navTop: n.top, rowBottom: r.bottom };
  });
  expect(m, 'could not measure nav/row').not.toBeNull();

  // The bottom of the last row must sit at or above the top of the fixed nav.
  expect(
    m!.rowBottom,
    `last row bottom (${Math.round(m!.rowBottom)}px) is under the nav top (${Math.round(m!.navTop)}px)`,
  ).toBeLessThanOrEqual(m!.navTop + 1);
});
