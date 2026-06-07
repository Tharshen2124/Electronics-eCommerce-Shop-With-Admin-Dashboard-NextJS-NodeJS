import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MERCHANT_ID = '0123100001';

// ─── F002 - Delete Product ────────────────────────────────────────────────────
// Decision Table:
// | Product Exists | Has FK (in orders) | Expected Outcome                            |
// |----------------|--------------------|---------------------------------------------|
// | Yes            | No                 | Success — toast + redirect to /admin/products |
// | Yes            | Yes                | Error  — FK constraint toast stays on page  |

test.describe('F002 - Delete Product', () => {
    let testCategoryId: string;
    let testProductId: string;
    let testOrderId: string | null = null;

    test.beforeEach(async ({ page, context }) => {
        const suffix = Date.now();

        const category = await prisma.category.create({
            data: { name: `test-delete-category-${suffix}` }
        });
        testCategoryId = category.id;

        const product = await prisma.product.create({
            data: {
                slug: `test-delete-product-${suffix}`,
                title: `Test Delete Product ${suffix}`,
                mainImage: 'placeholder.jpg',
                description: 'Test product for delete testing',
                manufacturer: 'Test Manufacturer',
                price: 100,
                categoryId: category.id,
                merchantId: MERCHANT_ID,
            }
        });
        testProductId = product.id;
        testOrderId = null;

        await context.clearCookies();
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email address', { exact: true }).fill('admin@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('Admin12345!');
        await page.getByRole('button', { name: /SIGN IN/i }).click();
        await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(5000);
    });

    test('TCDT-02-001 | Product exists, no FK constraint → deleted successfully', async ({ page }) => {
        await page.goto(`http://localhost:3000/admin/products/${testProductId}`);
        await page.getByRole('button', { name: /Delete product/i }).click();

        await expect(page.getByText(/Product deleted successfully/i)).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveURL('http://localhost:3000/admin/products', { timeout: 10000 });
    });

    test('TCDT-02-002 | Product exists, has FK constraint (in order) → error toast', async ({ page }) => {
        const order = await prisma.customer_order.create({
            data: {
                name: 'Test',
                lastname: 'User',
                phone: '0123456789',
                email: 'test@example.com',
                company: 'Test Co',
                adress: '123 Test St',
                apartment: 'Unit 1',
                postalCode: '50000',
                status: 'pending',
                city: 'Kuala Lumpur',
                country: 'Malaysia',
                total: 100,
                products: {
                    create: {
                        productId: testProductId,
                        quantity: 1,
                    }
                }
            }
        });
        testOrderId = order.id;

        await page.goto(`http://localhost:3000/admin/products/${testProductId}`);
        await page.getByRole('button', { name: /Delete product/i }).click();

        await expect(page.getByText(/Cannot delete the product because of foreign key constraint/i)).toBeVisible({ timeout: 10000 });
        await expect(page).not.toHaveURL('http://localhost:3000/admin/products', { timeout: 5000 });
    });

    test.afterEach(async ({ context }) => {
        if (testOrderId) {
            await prisma.customer_order_product.deleteMany({ where: { productId: testProductId } });
            await prisma.customer_order.deleteMany({ where: { id: testOrderId } });
        }
        // deleteMany is a no-op if record is already gone (e.g. deleted by the test)
        await prisma.product.deleteMany({ where: { id: testProductId } });
        await prisma.category.deleteMany({ where: { id: testCategoryId } });
        await context.clearCookies();
    });

});

// ─── F003 - Delete Category ───────────────────────────────────────────────────
// Decision Table:
// | Category Exists | Has Products | Expected Outcome                                      |
// |-----------------|--------------|-------------------------------------------------------|
// | Yes             | No           | Success — toast + redirect to /admin/categories       |
// | Yes             | Yes          | Success — cascade deletes products, same redirect     |

test.describe('F003 - Delete Category', () => {
    let testCategoryId: string;
    let testProductId: string | null = null;

    test.beforeEach(async ({ page, context }) => {
        const suffix = Date.now();

        const category = await prisma.category.create({
            data: { name: `test-delete-cat-${suffix}` }
        });
        testCategoryId = category.id;
        testProductId = null;

        await context.clearCookies();
        await page.goto('http://localhost:3000/login');
        await page.getByLabel('Email address', { exact: true }).fill('admin@gmail.com');
        await page.getByLabel('Password', { exact: true }).fill('Admin12345!');
        await page.getByRole('button', { name: /SIGN IN/i }).click();
        await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(5000);
    });

    test('TCDT-03-001 | Category exists, no products → deleted successfully', async ({ page }) => {
        await page.goto(`http://localhost:3000/admin/categories/${testCategoryId}`);
        await page.getByRole('button', { name: /Delete category/i }).click();

        await expect(page.getByText(/Category deleted successfully/i)).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveURL('http://localhost:3000/admin/categories', { timeout: 10000 });
    });

    test('TCDT-03-002 | Category exists, has products → cascade delete succeeds', async ({ page }) => {
        const product = await prisma.product.create({
            data: {
                slug: `test-cascade-product-${Date.now()}`,
                title: 'Test Cascade Product',
                mainImage: 'placeholder.jpg',
                description: 'Product for cascade delete test',
                manufacturer: 'Test Manufacturer',
                price: 100,
                categoryId: testCategoryId,
                merchantId: MERCHANT_ID,
            }
        });
        testProductId = product.id;

        await page.goto(`http://localhost:3000/admin/categories/${testCategoryId}`);
        await page.getByRole('button', { name: /Delete category/i }).click();

        await expect(page.getByText(/Category deleted successfully/i)).toBeVisible({ timeout: 10000 });
        await expect(page).toHaveURL('http://localhost:3000/admin/categories', { timeout: 10000 });

        // Verify the product was also removed by the cascade
        const deletedProduct = await prisma.product.findUnique({ where: { id: product.id } });
        expect(deletedProduct).toBeNull();
        testProductId = null;
    });

    test.afterEach(async ({ context }) => {
        if (testProductId) {
            await prisma.product.deleteMany({ where: { id: testProductId } });
        }
        await prisma.category.deleteMany({ where: { id: testCategoryId } });
        await context.clearCookies();
    });

    test.afterAll(async () => {
        await prisma.$disconnect();
    });
});
