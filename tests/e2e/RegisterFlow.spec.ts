import { test, expect } from '@playwright/test';

test('Register Flow', async ({ page }) => {
  const email = `${crypto.randomUUID()}@example.com`;
  
  await page.goto('http://localhost:3000/');

  await page.getByText('Register').first().click();
  
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();

  await page.getByLabel('Name', { exact: true }).fill('John');
  await page.getByLabel('Lastname', { exact: true }).fill('Doe');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('567890QWwe#$');
  await page.getByLabel('Confirm password', { exact: true }).fill('567890QWwe#$');
  await page.getByLabel(/accept our terms and privacy policy/i).check();
  
  await page.getByRole('button', { name: /SIGN UP/i }).click();

  await expect(page.getByText(/Registration successful/i)).toBeVisible({ timeout: 10000 });

  await expect(page.getByRole('heading', { name: 'Dummy fail' })).toBeVisible();

  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('567890QWwe#$');
  await page.getByRole('button', { name: /SIGN IN/i }).click();

  await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
});
