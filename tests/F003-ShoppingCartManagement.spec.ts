import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('F003 - Shopping Cart Management (Decision Table)', () => {
    test.beforeEach(async ({ page }) => {
        // Login as regular user
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email address').fill('irfan@gmail.com');
        await page.getByLabel('Password').fill('G0@wayh@ckers');
        await page.getByRole('button', { name: /SIGN IN/i }).click();
        await expect(page).toHaveURL('http://localhost:3000/');
    });

    test('TC-03-DT-001 | TCON-03-001 | TCOV-03-001 | Add item to cart → item added, cart badge updated', async ({ page }) => {
        await page.goto('http://localhost:3000/shop');
        await page.waitForSelector('text="Filters"');

        // Note: cart badge class might be indicator-item or badge within cart button
        // So we just check if it exists or bypass counting strictly if not easy to target.
        const cartBadge = page.locator('.indicator-item.badge.badge-secondary');
        const initialCountText = await cartBadge.textContent().catch(() => '0');
        const initialCount = parseInt(initialCountText || '0');

        await page.getByText('View product').first().click();
        
        await page.getByRole('button', { name: /ADD TO CART/i }).click();

        await expect(page.getByText(/Product added to cart/i, { exact: false })).toBeVisible();

        const finalCountText = await cartBadge.textContent().catch(() => '0');
        const finalCount = parseInt(finalCountText || '0');
        expect(finalCount).toBeGreaterThanOrEqual(initialCount + 1);
    });

    test('TC-03-DT-002 | TCON-03-002 | TCOV-03-002 | Increase item quantity within stock → quantity updated, total recalculated', async ({ page }) => {
        await page.goto('http://localhost:3000/shop');
        await page.getByText('View product').first().click();
        await page.getByRole('button', { name: /ADD TO CART/i }).click();
        
        await page.goto('http://localhost:3000/cart');
        
        // Wait for cart table
        await page.waitForSelector('table');
        
        // Click '+' button
        await page.getByRole('button', { name: '+' }).first().click();
        
        // The input should now be 2 (or more if they added multiple)
        const qtyInput = page.locator('input[type="number"]').first();
        const val = await qtyInput.inputValue();
        expect(parseInt(val)).toBeGreaterThan(1);
        
        await expect(page.getByText(/Total:/i)).toBeVisible();
    });

    test('TC-03-DT-003 | TCON-03-003 | TCOV-03-003 | Increase quantity beyond available stock → block with error', async ({ page }) => {
        // Option 1 fallback to Option 2
        let lowStockProduct = await prisma.product.findFirst({
            where: { inStock: { lte: 2, gt: 0 } }
        });
        
        let createdTemp = false;
        if (!lowStockProduct) {
            // Need a category and merchant
            const cat = await prisma.category.findFirst();
            const merch = await prisma.merchant.findFirst();
            if (!cat || !merch) throw new Error("No category/merchant found to create test product");
            
            lowStockProduct = await prisma.product.create({
                data: {
                    title: 'Low Stock Test Product F003',
                    price: 10,
                    inStock: 1,
                    description: 'Test product for boundary analysis',
                    manufacturer: 'TestMaker',
                    slug: 'low-stock-test-f003',
                    mainImage: 'https://example.com/img.jpg',
                    categoryId: cat.id,
                    merchantId: merch.id,
                    rating: 5
                }
            });
            createdTemp = true;
        }

        try {
            await page.goto(`http://localhost:3000/product/${lowStockProduct.slug}`);
            await page.getByRole('button', { name: /ADD TO CART/i }).click();
            
            await page.goto('http://localhost:3000/cart');
            await page.waitForSelector('table');
            
            // Try to increase more times than stock
            for (let i = 0; i < lowStockProduct.inStock + 1; i++) {
                await page.getByRole('button', { name: '+' }).first().click();
                await page.waitForTimeout(300); // Give UI time to respond
            }
            
            // Error toast should appear
            await expect(page.getByText(/Out of stock/i).or(page.getByText(/Limit Exceeded/i)).or(page.getByText(/Stock limit reached/i)).or(page.getByText(/not enough stock/i))).toBeVisible();
            
            // Verify quantity input did not exceed inStock
            const qtyInput = page.locator('input[type="number"]').first();
            await expect(qtyInput).toHaveValue(lowStockProduct.inStock.toString());
        } finally {
            // Cleanup if we created it
            if (createdTemp && lowStockProduct) {
                // Must delete from cart first if stored in DB, but cart might be localstorage/session.
                await prisma.product.delete({ where: { id: lowStockProduct.id } });
            }
        }
    });

    test('TC-03-DT-004 | TCON-03-004 | TCOV-03-004 | Proceed to checkout with items in cart → redirect to checkout', async ({ page }) => {
        await page.goto('http://localhost:3000/shop');
        await page.getByText('View product').first().click();
        await page.getByRole('button', { name: /ADD TO CART/i }).click();
        
        await page.goto('http://localhost:3000/cart');
        await page.getByRole('button', { name: /CHECKOUT/i }).click();
        
        await expect(page).toHaveURL(/.*\/checkout/);
        await expect(page.getByRole('button', { name: /Place order/i })).toBeVisible();
    });

    test('TC-03-DT-005 | TCON-03-005 | TCOV-03-005 | Proceed to checkout with empty cart → block with warning', async ({ page }) => {
        // Fresh session has empty cart
        await page.goto('http://localhost:3000/cart');
        
        // Checkout should be disabled or absent
        const checkoutButton = page.getByRole('button', { name: /CHECKOUT/i });
        if (await checkoutButton.isVisible()) {
            await expect(checkoutButton).toBeDisabled();
        }
        
        // Wait for empty state message
        await expect(page.getByText(/Your cart is empty/i)).toBeVisible();
    });

    test.afterEach(async ({ context }) => {
        await context.clearCookies();
    });

    test.afterAll(async () => {
        await prisma.$disconnect();
    });
});
