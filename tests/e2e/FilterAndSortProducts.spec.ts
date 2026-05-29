import { test, expect } from '@playwright/test';

test.describe('Filter and Sort Products', () => {
    test.beforeEach(async ({ page, context }) => {
        await context.clearCookies();
        await page.goto("http://localhost:3000/login");
        await page.getByLabel('Email address', { exact: true }).fill("admin@gmail.com");
        await page.getByLabel('Password', { exact: true }).fill("Admin12345!");
        await page.getByRole('button', { name: /SIGN IN/i }).click();

        await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
        
        // stop test for 10 seconds
        await page.waitForTimeout(5000);
    });

    // completed
    // test('Main Flow', async ({ page }) => {
    //     await page.getByRole('link', { name: 'Head Phones Head Phones' }).click();
    //     // expect the URL to contain the word 'headphones'
    //     await expect(page).toHaveURL(/headphones/i);

    //     await expect(page.getByRole('heading', { name: /headphones/i })).toBeVisible({ timeout: 10000 });
    // })

    // completed
    test('Alternate Flow 1 - filter by availability status', async ({ page }) => {
        await page.getByRole('link', { name: 'SHOP NOW' }).click();

        await page.getByRole('checkbox', { name: 'Out of stock' }).uncheck();

        await page.waitForTimeout(2000);

        await page.getByRole('link', { name: 'View product' }).first().click();
        await page.waitForURL(/\/product\//);  // wait for product page nav to complete

        await expect(page.getByText('In stock')).toBeVisible({ timeout: 10000 });

        await page.goto('http://localhost:3000/shop?outOfStock=false&inStock=true&rating=0&price=3000&sort=defaultSort&page=1');
        await page.waitForLoadState('networkidle');

        await page.getByRole('checkbox', { name: 'In stock' }).uncheck();
        await page.getByRole('checkbox', { name: 'Out of stock' }).check();

        await page.waitForTimeout(2000);

        await page.getByRole('link', { name: 'View product' }).first().click();
        await page.waitForURL(/\/product\//);  // same here

        await expect(page.getByText('Out of stock')).toBeVisible({ timeout: 10000 });
    })

    // test('Alternate Flow 2 - filter products by maximum price', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();

    //     await page.getByRole('slider').first().fill('40');
    //     await page.goto('http://localhost:3000/shop?outOfStock=true&inStock=true&rating=0&price=40&sort=defaultSort&page=1');
    //     await expect(page.getByText('Max price: $40')).toBeVisible({ timeout: 10000 }); // might fail, codegen didn't pick up the 40 value for some reason

    //     // try to AI this part on the best way to determine the price of the products

    // })

    // test('Alternate Flow 3 - filter by minimum rating', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();

    //     await page.getByRole('slider').nth(1).fill('5');
        
    //     // expect the URL since can't find rating text
    //     await expect(page).toHaveURL('http://localhost:3000/shop?outOfStock=true&inStock=true&rating=5&price=3000&sort=defaultSort&page=1');
    // })

    // figure out the best way to test the sort options

    // test('Alternate Flow 4 - sorts products alphabetically from A to Z', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();
    // })

    // test('Alternate Flow 5 - sorts products alphabetically from Z to A', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();
    // })


    // test('Alternate Flow 6 - sorts products by lowest price', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();
    // })


    // test('Alternate Flow 7 - sorts products by highest price.', async ({ page }) => {
    //     await page.getByRole('link', { name: 'SHOP NOW' }).click();
    // })


    // test('Alternate Flow 8 - applies multiple filters and a sort option simultaneously', async ({ page }) => {

    // })

    test.afterEach(async ({ context }) => {
        await context.clearCookies();
    })
})