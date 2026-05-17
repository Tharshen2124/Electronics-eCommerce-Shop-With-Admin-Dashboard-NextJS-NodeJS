// import { test, expect } from "@playwright/test";

// test.describe("Update Category", () => {    
//     test.beforeEach(async ({ page }) => {
//         await page.goto("http://localhost:3000/login");
//         await page.getByLabel('Email address', { exact: true }).fill("admin@gmail.com");
//         await page.getByLabel('Password', { exact: true }).fill("Admin12345!");
//         await page.getByRole('button', { name: /SIGN IN/i }).click();

//         await expect(page.getByText(/Successful login/i)).toBeVisible({ timeout: 10000 });
        
//         // stop test for 10 seconds
//         await page.waitForTimeout(10000);
//     });

//     test("Main Flow", async ({ page }) => {
//         const categoryName = Math.random().toString(36).substring(2, 7);

//         await page.goto("http://localhost:3000/admin");

//         await page.getByRole("link", { name: "Categories" }).click();
//         await page.getByRole("button", { name: "Add new category" }).click();
//         await page.getByRole("textbox", { name: "Category name:" }).click();
//         await page.getByRole("textbox", { name: "Category name:" }).fill(categoryName);
//         await page.getByRole("button", { name: "Create category" }).click();

//         await expect(page.getByText(/Category added successfully/i)).toBeVisible({ timeout: 10000 });

//         await page.getByRole("link", { name: "Categories" }).click();

//         await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10000 });
//     });

//     test("Alternate Flow 1 - Empty Category Name", async ({ page }) => {
//         await page.goto("http://localhost:3000/admin");
        
//         await page.getByRole("link", { name: "Categories" }).click();
//         await page.getByRole("button", { name: "Add new category" }).click();
//         await page.getByRole("textbox", { name: "Category name:" }).click();
//         await page.getByRole("textbox", { name: "Category name:" }).fill("");
//         await page.getByRole("button", { name: "Create category" }).click();
//         await expect(page.getByText(/You need to enter values to add a category/i)).toBeVisible({ timeout: 10000 });
//     });

//     // test("Alternate Flow 2 - Duplicate Category Name", async ({ page }) => {
//     //     const categoryName = "cameras";
    
//     //     await page.goto("http://localhost:3000/admin");
//     //     await page.getByRole("link", { name: "Categories" }).click();
//     //     await page.getByRole("button", { name: "Add new category" }).click();
//     //     await page.getByRole("textbox", { name: "Category name:" }).click();
//     //     await page.getByRole("textbox", { name: "Category name:" }).fill(categoryName);

//     //     await page.getByRole("button", { name: "Create category" }).click();

//     //     await expect(page.getByText(/Category with this name already exists/i)).toBeVisible({ timeout: 10000 });
//     // })
// });