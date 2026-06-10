import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ request }) => {
  await request.post('/api/__reset');
});

test('list page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('detail page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/contacts/seed-001');
  await expect(page.getByRole('heading', { name: 'Amit Bansal' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
