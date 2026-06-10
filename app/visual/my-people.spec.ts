import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * Responsive screenshot sweep for the "My People" feature.
 *
 * For every (scenario × breakpoint) pair this captures a full-page PNG into
 * ./screenshots/my-people/ and records an entry in manifest.json. It is a
 * capture tool, not a pass/fail gate — open the folder (or hand the manifest to
 * Claude) to review layout across viewports.
 *
 * Run with:  pnpm screenshots
 */

const OUT_DIR = path.resolve(process.cwd(), 'screenshots', 'my-people');

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 }, // iPhone-class
  { name: 'tablet', width: 768, height: 1024 }, // Tailwind md
  { name: 'laptop', width: 1024, height: 768 }, // Tailwind lg
  { name: 'desktop', width: 1440, height: 900 }, // common desktop
] as const;

type Scenario = {
  id: string;
  description: string;
  // Drive the page into the state we want to photograph, then return.
  setup: (page: Page) => Promise<void>;
  // Modal/overlay shots look better as a viewport shot than a full-page one.
  fullPage?: boolean;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'list',
    description: 'Contact list (My People) with seeded contacts',
    fullPage: true,
    setup: async (page) => {
      await page.goto('/contacts');
      await expect(page.getByRole('heading', { name: 'My People' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeVisible();
    },
  },
  {
    id: 'list-search',
    description: 'Contact list filtered by search',
    fullPage: true,
    setup: async (page) => {
      await page.goto('/contacts');
      await page.getByRole('searchbox', { name: /search contacts/i }).fill('Priya');
      await expect(page.getByRole('button', { name: 'Priya Shah', exact: true })).toBeVisible();
      // Wait for the debounced filter to settle (a non-match must disappear)
      // so the screenshot captures the filtered state, not the pre-filter list.
      await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeHidden();
    },
  },
  {
    id: 'detail',
    description: 'Contact detail page (seed-001, Amit Bansal)',
    fullPage: true,
    setup: async (page) => {
      await page.goto('/contacts/seed-001');
      await expect(page.getByRole('heading', { name: /Amit Bansal/i })).toBeVisible();
    },
  },
  {
    id: 'add-modal',
    description: 'Add Contact dialog open over the list',
    fullPage: false,
    setup: async (page) => {
      await page.goto('/contacts');
      await page.getByRole('button', { name: 'Add Contact' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
];

const manifest: Array<{
  scenario: string;
  description: string;
  breakpoint: string;
  width: number;
  height: number;
  file: string;
}> = [];

test.beforeAll(async ({ request }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Reset the in-memory store to deterministic seed data.
  await request.post('/api/__reset');
});

test.afterAll(async () => {
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
});

for (const scenario of SCENARIOS) {
  for (const bp of BREAKPOINTS) {
    test(`${scenario.id} @ ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await scenario.setup(page);
      // Let layout/animations settle.
      await page.waitForTimeout(300);

      const file = `${scenario.id}__${bp.name}-${bp.width}.png`;
      await page.screenshot({
        path: path.join(OUT_DIR, file),
        fullPage: scenario.fullPage ?? true,
        animations: 'disabled',
      });

      manifest.push({
        scenario: scenario.id,
        description: scenario.description,
        breakpoint: bp.name,
        width: bp.width,
        height: bp.height,
        file,
      });
    });
  }
}
