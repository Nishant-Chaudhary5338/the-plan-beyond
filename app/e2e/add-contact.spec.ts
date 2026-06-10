import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request, page }) => {
  await request.post('/api/__reset');
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'Add Contact' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('validates an invalid phone number', async ({ page }) => {
  await page.getByPlaceholder('First name').fill('Test');
  await page.getByPlaceholder('Phone number').fill('123');
  await page.getByRole('button', { name: 'Add Contact', exact: true }).click();
  await expect(page.getByText(/valid phone number/i)).toBeVisible();
});

test('adds a contact and opens its detail page', async ({ page }) => {
  await page.getByPlaceholder('First name').fill('Neha');
  await page.getByPlaceholder('Last name').fill('Kapoor');
  await page.getByPlaceholder('Phone number').fill('9123456780');
  await page.getByRole('button', { name: 'Add Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contacts\/[\w-]+$/);
  await expect(page.getByRole('heading', { name: 'Neha Kapoor' })).toBeVisible();
});

test('rejects a duplicate number with the server error', async ({ page }) => {
  await page.getByPlaceholder('First name').fill('Dup');
  await page.getByPlaceholder('Phone number').fill('9867239020'); // Amit's seeded number
  await page.getByRole('button', { name: 'Add Contact', exact: true }).click();
  await expect(page.getByText(/already exists/i)).toBeVisible();
});
