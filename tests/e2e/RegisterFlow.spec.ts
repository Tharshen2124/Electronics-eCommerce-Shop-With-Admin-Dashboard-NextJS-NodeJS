import { test, expect } from '@playwright/test';

test.describe('Register Flow', () => {
  test('Main Flow', async ({ page }) => {
    const email = `${crypto.randomUUID()}@example.com`;
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Name', { exact: true }).fill('John');
    await page.getByLabel('Lastname', { exact: true }).fill('Doe');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('567890QWwe#$');
    await page.getByLabel('Confirm password', { exact: true }).fill('567890QWwe#$');
    await page.getByLabel(/accept our terms and privacy policy/i).check();
    
    await page.getByRole('button', { name: /SIGN UP/i }).click();

    await expect(page.getByText(/Registration successful/i)).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('567890QWwe#$');
    await page.getByRole('button', { name: /SIGN IN/i }).click();

    await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
  });

  test('Alternate Flow 1 - Duplicate Email', async ({ page }) => {

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });

    await page.getByLabel('Name', { exact: true }).fill('Tharshen');
    await page.getByLabel('Lastname', { exact: true }).fill('Surian');
    await page.getByLabel('Email address', { exact: true }).fill('tharshen@gmail.com');
    await page.getByLabel('Password', { exact: true }).fill('User12345!');
    await page.getByLabel('Confirm password', { exact: true }).fill('User12345!');
    await page.getByLabel(/accept our terms and privacy policy/i).check();
    
    await page.getByRole('button', { name: /SIGN UP/i }).click();

    await expect(page.locator('text=Email is already in use').nth(1)).toBeVisible({ timeout: 5000 });
  })

  test('Alternate Flow 2 - Password does not meet requirements', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Name', { exact: true }).fill('Charlie');
    await page.getByLabel('Lastname', { exact: true }).fill('Brown');
    await page.getByLabel('Email address', { exact: true }).fill(`${crypto.randomUUID()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('12121212');
    await page.getByLabel('Confirm password', { exact: true }).fill('12121212');
    await page.getByLabel(/accept our terms and privacy policy/i).check();
    
    await page.getByRole('button', { name: /SIGN UP/i }).click();

    await expect(page.locator('text=Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character').nth(1)).toBeVisible({ timeout: 5000 });
  })

  test('Alternate Flow 3 - Password and Confirm Password Mismatch', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Name', { exact: true }).fill('Alice');
    await page.getByLabel('Lastname', { exact: true }).fill('Smith');
    await page.getByLabel('Email address', { exact: true }).fill(`${crypto.randomUUID()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('Password1234!');
    await page.getByLabel(/accept our terms and privacy policy/i).check();

    await page.getByRole('button', { name: /SIGN UP/i }).click();

    await expect(page.locator('text=Passwords are not equal').nth(1)).toBeVisible({ timeout: 5000 });
  })

  test('Alternate Flow 4 - Empty Fields', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Register').first().click();
    // check back requirements if we use error messages 
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
    await page.getByLabel('Name', { exact: true }).fill('Alice');
    await page.getByLabel('Lastname', { exact: true }).fill('Smith');

    await page.getByRole('button', { name: /SIGN UP/i }).click();
    
    await expect(page.getByText(/Please fill in all required fields/i)).toBeVisible({ timeout: 5000 });
  })

  test('Alternate Flow 5 - Invalid Email Format', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Name', { exact: true }).fill('Eve');
    await page.getByLabel('Lastname', { exact: true }).fill('Davis');
    await page.getByLabel('Email address', { exact: true }).fill('invalid-email-format');
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('Password123!');
    await page.getByLabel(/accept our terms and privacy policy/i).check();
    
    await page.getByRole('button', { name: /SIGN UP/i }).click();
    
    await expect(page.getByText(/Invalid email format/i)).toBeVisible({ timeout: 5000 });
  })

  test('Alternate Flow 6 - Terms Not Accepted', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Register').first().click();
    
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible({ timeout: 10000 });
    
    await page.getByLabel('Name', { exact: true }).fill('Bob');
    await page.getByLabel('Lastname', { exact: true }).fill('Johnson');
    await page.getByLabel('Email address', { exact: true }).fill(`${crypto.randomUUID()}@example.com`);
    await page.getByLabel('Password', { exact: true }).fill('Password123!');
    await page.getByLabel('Confirm password', { exact: true }).fill('Password123!');
        
    await page.getByRole('button', { name: /SIGN UP/i }).click();

    await expect(page.getByText(/Please accept our terms and privacy policy/i)).toBeVisible({ timeout: 5000 });
  })

  test.afterEach(async ({ context }) => {
    await context.clearCookies();
  })
});
