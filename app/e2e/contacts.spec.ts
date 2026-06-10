import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request, page }) => {
  await request.post('/api/__reset');
  await page.goto('/contacts');
  await expect(page.getByRole('heading', { name: 'My People' })).toBeVisible();
});

test('lists seeded contacts with a page range', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeVisible();
  await expect(page.getByText('1–25 of 30')).toBeVisible();
});

test('filters the list with search', async ({ page }) => {
  await page.getByRole('searchbox', { name: /search contacts/i }).fill('Priya');
  await expect(page.getByRole('button', { name: 'Priya Shah', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeHidden();
});

test('paginates to the next page', async ({ page }) => {
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('26–30 of 30')).toBeVisible();
});

test('opens a contact, edits, and saves', async ({ page }) => {
  await page.getByRole('button', { name: 'Amit Bansal', exact: true }).click();
  await expect(page).toHaveURL(/\/contacts\/seed-001$/);
  // Optional empty fields collapse to "+ Add" (B7) — reveal before editing.
  await page.getByRole('button', { name: 'Add middle name' }).click();
  await page.getByLabel('Middle name').fill('Kumar');
  await expect(page.getByRole('region', { name: /unsaved changes/i })).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await expect(page.getByRole('region', { name: /unsaved changes/i })).toBeHidden();
});

test('deletes a contact after confirmation', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Amit Bansal' }).click();
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('button', { name: 'Amit Bansal', exact: true })).toBeHidden();
});
