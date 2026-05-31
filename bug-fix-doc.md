# Bug Fix Documentation

---

## Bugs List
- [x] Bug-C01   - Data Persistence Defect in User Registration
- [x] Bug-C02   - Pagination Count Calculation Defect
- [x] Bug-C03   - Branding Misconfiguration Defect (Metadata)
- [x] Bug-C04   - Incorrect Empty State Display During Data Fetching
- [x] Bug-C05   - Media Upload Handling and Validation Defect
- [x] Bug-C06   - Incorrect Checkout Scope Handling in Cart Module
- [ ] Bug-P01   - (Search performance efficiency)
- [ ] Bug-P02   - (Form Validation Latency)
- [x] Bug-PR01  - (Unit Test) 
- [x] Bug-A01   - (Lack of Cloud Native Containerisation)
- [ ] Bug-A02   - (Database Infrastructure Scalability Limitation)

---

## BUG-C01: Data Persistence Defect in User Registration

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C01 |
| **Severity** | High |
| **Module** | Authentication / User Registration |
| **Status** | Fixed |

### Context

The registration form collects five fields from the user: name, lastname, email, password, and confirm password. Submitting the form successfully created a user account and redirected to the login page, but the name and lastname values were silently discarded — they were never sent to the API and never written to the database.

### Root Cause

The bug existed across three layers simultaneously.

**Schema layer** — The `User` model in `prisma/schema.prisma` had no `name` or `lastname` columns, so there was nowhere to persist the data even if it had been sent.

**Validation layer** — `utils/schema.ts` defined `registrationSchema` with only `email` and `password`. Any name/lastname values in the request body would be stripped by Zod's `safeParse`.

**API layer** — `app/api/register/route.ts` destructured only `{ email, password }` from the validated result and passed only those two fields to `prisma.user.create`.

**Frontend layer** — `app/register/page.tsx` read form values by index (`e.target[2]` for email, `e.target[3]` for password) but never read `e.target[0]` (name) or `e.target[1]` (lastname), and the `fetch` body omitted both fields entirely.

### Solution

**`prisma/schema.prisma`** (both `/prisma/` and `/server/prisma/`) — Added `name String?` and `lastname String?` to the `User` model.

```prisma
model User {
  id       String  @id @default(uuid())
  name     String?
  lastname String?
  email    String  @unique
  ...
}
```

**`utils/schema.ts`** — Extended `registrationSchema` to include the two new required fields.

```ts
export const registrationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  lastname: z.string().min(1, "Lastname is required").max(100),
  email: commonValidations.email,
  password: commonValidations.password,
});
```

**`app/api/register/route.ts`** — Destructured `name` and `lastname` from the validated result and included them in the `prisma.user.create` call.

```ts
const { name, lastname, email, password } = validationResult.data;

await prisma.user.create({
  data: { id: nanoid(), name, lastname, email, password: hashedPassword, role: "user" },
});
```

**`app/register/page.tsx`** — Added reads for `e.target[0]` (name) and `e.target[1]` (lastname) and included both in the `fetch` body.

```ts
const name = e.target[0].value;
const lastname = e.target[1].value;
// ...
body: JSON.stringify({ name, lastname, email, password }),
```

A Prisma migration (`add-name-lastname-to-user`) must be run to apply the schema change to the database.

### Files Affected

- `prisma/schema.prisma`
- `server/prisma/schema.prisma`
- `utils/schema.ts`
- `app/api/register/route.ts`
- `app/register/page.tsx`

---

## BUG-C02: Pagination Count Calculation Defect

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C02 |
| **Severity** | Medium |
| **Module** | Shop / Pagination |
| **Status** | Fixed |

### Context

The shop page displays products in pages of 6. Clicking the next-page button (`»`) increments the current page via Zustand, which `Filters.tsx` syncs to the URL, causing the `Products` server component to re-fetch with the new page number. The bug allowed a user to keep clicking `»` indefinitely — pages with no products would render the "No products found" empty state with no indication that the end had been reached.

### Root Cause

`paginationStore.ts` had no concept of a maximum page. `incrementPage()` unconditionally added 1 to `page` with no upper bound check.

```ts
// before fix
incrementPage: () => {
  set((state) => {
    state.page = state.page + 1;
    return { page: state.page };
  });
},
```

The `Products` server component returned a plain array from the API with no total count, so there was no data available to derive a page limit. `Pagination.tsx` had no `disabled` state on either button.

### Solution

**`server/controllers/products.js`** — Added a parallel `prisma.product.count()` query using the same `where` clause as the `findMany`. The endpoint now returns `{ products, total, pageSize }` instead of a bare array.

```js
const PAGE_SIZE = 6;

[products, total] = await Promise.all([
  prisma.product.findMany({ skip: (validatedPage - 1) * PAGE_SIZE, take: PAGE_SIZE, ... }),
  prisma.product.count({ where: whereClause }),
]);

return response.json({ products, total, pageSize: PAGE_SIZE });
```

**`app/_zustand/paginationStore.ts`** — Added `totalPages` state (default `1`), a `setTotalPages` action, and an upper-bound guard inside `incrementPage`.

```ts
totalPages: 1,
incrementPage: () => {
  set((state) => {
    if (state.page >= state.totalPages) return {};
    return { page: state.page + 1 };
  });
},
setTotalPages: (total) => set({ totalPages: total }),
```

**`components/PaginationSetter.tsx`** (new) — A `"use client"` component that accepts `totalPages` as a prop and writes it into the Zustand store via `useEffect`. This bridges the server component boundary — `Products` (server) renders it with the computed value, and the store is updated on the client without converting `Products` to a client component.

```tsx
const PaginationSetter = ({ totalPages }: { totalPages: number }) => {
  const setTotalPages = usePaginationStore((state) => state.setTotalPages);
  useEffect(() => { setTotalPages(totalPages); }, [totalPages, setTotalPages]);
  return null;
};
```

**`components/Products.tsx`** — Parses the new response shape, computes `totalPages`, and renders `<PaginationSetter totalPages={totalPages} />`.

**`components/Pagination.tsx`** — Both buttons now carry a `disabled` prop so they are visually and functionally inert at the boundaries.

```tsx
<button disabled={page <= 1} onClick={() => decrementPage()}>«</button>
<button disabled={page >= totalPages} onClick={() => incrementPage()}>»</button>
```

### Files Affected

- `server/controllers/products.js`
- `app/_zustand/paginationStore.ts`
- `components/PaginationSetter.tsx` *(new)*
- `components/Products.tsx`
- `components/Pagination.tsx`

---

## BUG-C03: Branding Misconfiguration Defect (Metadata)

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C03 |
| **Severity** | Low |
| **Module** | Application / SEO / Metadata |
| **Status** | Fixed |

### Context

The browser tab and HTML metadata displayed the default Next.js template values — `"Create Next App"` as the page title and `"Generated by create next app"` as the meta description — instead of the application's intended branding. While not functionally critical, this defect affects professional presentation and has SEO implications: search engines rely on the title and meta description tags to accurately index and surface web applications in search results. Default placeholder values may also mislead users regarding the identity and legitimacy of the application.

### Root Cause

The `metadata` export in `app/layout.tsx` was never updated from the values scaffolded by `create-next-app`. The two fields — `title` and `description` — retained their framework-generated defaults.

```ts
// before fix
export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};
```

### Solution

**`app/layout.tsx`** — Updated the `metadata` export with the correct application name and a descriptive summary of the platform.

```ts
export const metadata: Metadata = {
  title: "Singitronic - Electronic Ecommerce",
  description: "Singitronic is your one-stop online shop for the latest electronics, gadgets, and tech accessories. Browse a wide range of products with easy filtering, sorting, and secure checkout.",
};
```

### Files Affected

- `app/layout.tsx`

---

## BUG-C04: Incorrect Empty State Display During Data Fetching

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C04 |
| **Severity** | Medium |
| **Module** | Shop / UI State Management |
| **Status** | Fixed |

### Context

When navigating to a shop category from the home page, the shop page would briefly flash the message "No products found for specified query" before the category's products appeared. The issue was reproducible and clearly visible with a throttled network connection (slow 4G).

### Root Cause

`Products` was an async server component that fetched products on the server and conditionally rendered either the product grid or the "No products found" message based on whether `products.length > 0`. The initial `products` value was `[]`.

`Filters.tsx` is a client component that calls `router.replace()` inside a `useEffect` with no dependencies other than its own local state, meaning it fires on every mount. This triggers a soft navigation via Next.js router, which internally uses React's `startTransition`. Transitions are designed to keep the old UI visible while the new render is pending — they do not trigger Suspense fallbacks on the already-mounted tree. As a result, on first load the shop page rendered with an empty product set (before `Filters` had set the URL params), producing a brief flash of the empty state before the correct products loaded.

Adding a `<Suspense>` boundary around `Products` in `page.tsx` did not resolve the issue because the Suspense fallback is bypassed for updates triggered via `startTransition`.

### Solution

`Products` was converted from an async server component to a `"use client"` component that owns its loading state explicitly. It reads URL params directly via `useParams()` and `useSearchParams()` hooks and manages three distinct states — loading, empty, and populated — independently.

**`components/Products.tsx`** — Converted to a client component. `isLoading` initialises to `true`, which means the Loader renders immediately on both the server (SSR) and the client before any fetch has been attempted. "No products found" can only appear after `isLoading` has been set to `false` by the `finally` block of a completed fetch.

```tsx
"use client";

const Products = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // ... fetch with current URL params
        setProducts(result.products);
        setTotalPages(...);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams, params]);

  if (isLoading) return <Loader />;

  return (
    <>
      <PaginationSetter totalPages={totalPages} />
      <div className="grid ...">
        {products.length > 0 ? (
          products.map((product) => <ProductItem key={product.id} ... />)
        ) : (
          <h3>No products found for specified query</h3>
        )}
      </div>
    </>
  );
};
```

Because `Products` now reads `useSearchParams()` directly, it re-fetches automatically whenever `Filters` or `SortBy` update the URL — removing the need to pass `searchParams` as a prop from the page.

**`app/shop/[[...slug]]/page.tsx`** — Removed `searchParams` from the component signature and props passed to `<Products />`. The `<Suspense>` wrapper is retained as the Next.js-recommended boundary for components that use `useSearchParams()`.

```tsx
const ShopPage = async ({ params }: { params: Promise<{ slug?: string[] }> }) => {
  const awaitedParams = await params;
  return (
    ...
    <Suspense fallback={<Loader />}>
      <Products />
    </Suspense>
    ...
  );
};
```

### Files Affected

- `components/Products.tsx`
- `app/shop/[[...slug]]/page.tsx`

---

## BUG-C05: Media Upload Handling and Validation Defect

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C05 |
| **Severity** | High |
| **Module** | Admin Dashboard / Product Management |
| **Status** | Fixed |

### Context

On both the "Add new product" and "Edit product" admin pages, selecting an image file appeared to succeed — the filename was reflected in the UI and the product could be saved — but the image was never actually uploaded to the server. Products were saved with a `mainImage` filename that pointed to a file that did not exist on disk. Additionally, the upload input accepted any file of any type and any size with no feedback to the user about what was expected.

### Root Cause

**Upload failure** — `uploadFile` in both pages called `apiClient.post`, passing the `FormData` object as the `data` argument:

```ts
// broken call in both pages
const response = await apiClient.post("/api/main-image", {
  method: "POST",
  body: formData,
});
```

`apiClient.post` signature is `(endpoint, data, options)`. It always calls `JSON.stringify(data)` on the second argument and sets `Content-Type: application/json`. This meant the entire `{ method, body }` object — including the FormData — was JSON-stringified into the request body as a plain string, and the `Content-Type` header prevented the browser from setting the required `multipart/form-data` boundary. The Express server's `req.files` was always `undefined`, so no file was ever saved.

Additionally, `mainImage` in the product state was set unconditionally before checking whether the upload actually succeeded, meaning a failed upload still wrote the filename to the product record.

**No validation** — The `<input type="file">` elements had no `accept` attribute, no helper text describing constraints, and `uploadFile` performed no checks on the selected file before attempting the upload.

### Solution

`uploadFile` in both `app/(dashboard)/admin/products/new/page.tsx` and `app/(dashboard)/admin/products/[id]/page.tsx` was replaced with a raw `fetch` call that includes client-side type and size validation before the network request is made. Omitting `Content-Type` lets the browser correctly set `multipart/form-data` with the boundary parameter required by the server.

```ts
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_MB = 5;

const uploadFile = async (file: File): Promise<boolean> => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.error("Only JPG, PNG, and WebP images are allowed");
    return false;
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    toast.error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB`);
    return false;
  }

  const formData = new FormData();
  formData.append("uploadedFile", file);

  const response = await fetch(`${config.apiBaseUrl}/api/main-image`, {
    method: "POST",
    body: formData,
    // No Content-Type — browser sets multipart/form-data with boundary automatically
  });

  if (response.ok) {
    toast.success("Image uploaded successfully");
    return true;
  }
  toast.error("Image upload failed");
  return false;
};
```

The `onChange` handler was updated to await the result and only update `mainImage` in state if the upload returned `true`. If it fails, the file input is cleared so the user knows to retry.

```ts
onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const success = await uploadFile(file);
  if (success) {
    setProduct({ ...product, mainImage: file.name });
  } else {
    e.target.value = "";
  }
}}
```

The file input was also updated with an `accept` attribute and a helper line below it so requirements are visible before a file is chosen.

```tsx
<input
  type="file"
  accept="image/jpeg,image/jpg,image/png,image/webp"
  ...
/>
<span className="label-text-alt text-gray-500">
  Accepted formats: JPG, PNG, WebP · Max size: 5MB
</span>
```

### Files Affected

- `app/(dashboard)/admin/products/new/page.tsx`
- `app/(dashboard)/admin/products/[id]/page.tsx`

---

## BUG-C06: Incorrect Checkout Scope Handling in Cart Module

| Field | Detail |
|---|---|
| **Bug ID** | BUG-C06 |
| **Severity** | High |
| **Module** | Shopping Cart / Checkout |
| **Status** | Fixed |

### Context

The application supports two purchase paths: **Add to Cart → Checkout**, which processes all cart items, and **Buy Now**, which is intended to immediately purchase only the single product the user selected. The bug caused "Buy Now" to process all items in the cart instead of just the targeted product, and on order completion it wiped the user's entire cart.

### Root Cause

`BuyNowSingleProductBtn` called `addToCart()` — the same action used by the regular "Add to Cart" button — which merged the selected product into the shared `products` array in the Zustand store. The checkout page then unconditionally read the full `products` array with no mechanism to distinguish a "Buy Now" session from a regular cart checkout, submitting all items and calling `clearCart()` regardless of intent.

```tsx
// BuyNowSingleProductBtn.tsx — before fix
const { addToCart, calculateTotals } = useProductStore();

const handleAddToCart = () => {
  addToCart({ id: product?.id.toString(), ... }); // pollutes the shared cart
  calculateTotals();
  router.push("/checkout");
};
```

```tsx
// checkout/page.tsx — before fix
const { products, total, clearCart } = useProductStore();

// submitted all cart items regardless of how they got there
for (let i = 0; i < products.length; i++) {
  await addOrderProduct(orderId, products[i].id, products[i].amount);
}
clearCart(); // wiped the entire cart after every checkout
```

### Solution

A separate `buyNowItems` field was added to the Zustand store, isolated from the regular cart. The "Buy Now" button populates this field instead of `addToCart`. The checkout page then derives its working scope from `buyNowItems` when present, falling back to the full cart otherwise, and cleans up only the scope that was used.

**`app/_zustand/store.ts`** — Added `buyNowItems: ProductInCart[]` to state with `setBuyNowItems` and `clearBuyNowItems` actions. These actions only ever touch `buyNowItems`, making it structurally impossible for a "Buy Now" operation to affect the user's cart.

```ts
setBuyNowItems: (items) => set(() => ({ buyNowItems: items })),
clearBuyNowItems: () => set(() => ({ buyNowItems: [] })),
```

**`components/BuyNowSingleProductBtn.tsx`** — Replaced `addToCart` + `calculateTotals` with `setBuyNowItems`. The cart is never touched.

```tsx
const { setBuyNowItems } = useProductStore();

const handleBuyNow = () => {
  setBuyNowItems([{ id: product?.id.toString(), title: product?.title, price: product?.price, image: product?.mainImage, amount: quantityCount }]);
  router.push("/checkout");
};
```

**`app/checkout/page.tsx`** — The page now derives `checkoutItems` and `checkoutTotal` from the correct scope at the top of the component. All order display, validation, submission, and cleanup logic operates on these derived values rather than the raw store state.

```tsx
const { products, total, clearCart, buyNowItems, clearBuyNowItems } = useProductStore();

const checkoutItems = buyNowItems.length > 0 ? buyNowItems : products;
const checkoutTotal = checkoutItems.reduce((sum, p) => sum + p.price * p.amount, 0);
```

`checkoutTotal` is computed inline rather than reading `total` from the store because `calculateTotals()` is never called in the "Buy Now" flow, meaning the store's `total` would not reflect the selected item's price.

Post-order cleanup was also corrected to only clear what was used — `clearBuyNowItems()` in the Buy Now path (preserving the user's cart) or `clearCart()` for a normal cart checkout.

```tsx
if (buyNowItems.length > 0) {
  clearBuyNowItems();
} else {
  clearCart();
}
```

### Files Affected

- `app/_zustand/store.ts`
- `components/BuyNowSingleProductBtn.tsx`
- `app/checkout/page.tsx`

---

## BUG-PR01: Absence of Automated Testing Framework

| Field | Detail |
|---|---|
| **Bug ID** | BUG-PR01 |
| **Severity** | High |
| **Module** | Server / Testing |
| **Status** | Fixed |

### Context

The backend had 16 test files in `/server/tests/` and 2 files in `/server/tests/unit/`, but none of them used a test framework. They were standalone Node.js scripts executed manually via `node <file>.js`, relying on custom `assert()` helpers and `console.log` for pass/fail reporting. A developer had to run each file individually, read the terminal output, and visually confirm whether the test passed. There was no structured reporting, no aggregated results, and no way to integrate these scripts into an automated pipeline.

### Root Cause

The project had no standardised testing convention. Each test file was written as a self-contained script that directly called the API via `fetch`, directly queried the database via the Prisma client, and performed file system operations — all requiring a live running server and a populated database to execute. The files used a hand-rolled `assert()` function that threw on failure and printed to the console on success, making them impossible to discover or run through a test runner like Jest.

For example, `bulk-upload-smoketest.js` defined its own `assert`, `section`, and `logStep` helpers, ran Prisma migrations inline, performed health checks against a live server, and executed a full CRUD lifecycle against real API endpoints — all within a single `async function run()` invoked at the bottom of the file.

The two files in `/server/tests/unit/` (`address-validation.test.js` and `create-category.test.js`) were already written in Jest format with proper `describe`/`it` blocks, but the remaining 16 files in the root of `/server/tests/` were not.

### Solution

All 16 standalone test scripts were converted to Jest test files and placed under `/server/tests/jest/`, with the 2 existing unit test files placed under `/server/tests/jest/unit/`. The Jest configuration file was updated to include the new test directory.

The conversion followed these principles:

**Test structure** — Each script's logic was decomposed into `describe`/`it` blocks. Functions that were tested sequentially in a single `run()` function were broken out into individual `it()` cases, each targeting a single assertion. For instance, `bulk-upload-smoketest.js` — which tested CSV upload, batch listing, batch detail retrieval, item updates, and batch deletion in one linear flow — was split into dedicated test cases for each operation.

**Mocking HTTP calls** — All `fetch()` calls to `API_BASE_URL` were replaced with `jest.fn()` mocks. The converted tests do not require a running server. Expected responses are defined inline within each test case, and assertions validate the request parameters and response handling logic.

**Mocking Prisma** — Direct database calls (e.g., `prisma.category.create`, `prisma.product.findUnique`, `prisma.bulk_upload_batch.findUnique`) were mocked using `jest.mock()` against the Prisma client module. This isolates the tests from the database entirely.

**Mocking the file system** — File operations such as `fs.writeFileSync` and `fs.createReadStream` used in CSV upload tests were mocked via `jest.mock('fs')` to avoid creating temporary files during test execution.

**Lifecycle hooks** — `beforeEach` and `afterEach` were used to reset mocks between test cases. `beforeAll` and `afterAll` were used where shared setup or teardown was needed, such as defining common mock return values.

**Naming convention** — Each output file follows the `<original-name>.test.js` pattern (e.g., `bulk-upload-smoketest.js` → `bulk-upload-smoketest.test.js`).

**Import paths** — All `require()` paths were adjusted relative to the new `/server/tests/jest/` location (e.g., `../../utills/db` for the Prisma client, `../../controllers/` for controller modules).

The existing Jest style from the unit tests was used as the reference convention:

```js
describe("orderValidation.validateEmail", () => {
  it("accepts a valid email and normalizes casing and whitespace", () => {
    expect(orderValidation.validateEmail("  USER@Example.com  ")).toBe(
      "user@example.com"
    );
  });
});
```

### Files Affected

**Converted (16 files created under `server/tests/jest/`):**

- `bulk-upload-smoketest.test.js`
- `check-bulk-results.test.js`
- `check-bulk-upload.test.js`
- `check-products-db.test.js`
- `create-category.test.js`
- `curl-test-command.test.js`
- `db-check.test.js`
- `debug-bulk-upload.test.js`
- `repro-bulk.test.js`
- `simple-server-test.test.js`
- `test-bulk-upload-endpoint.test.js`
- `test-create-product.test.js`
- `test-create-verify.test.js`
- `test-db-bulk.test.js`
- `test-delete-batch.test.js`
- `test-upload-direct.test.js`

**Moved (2 files under `server/tests/jest/unit/`):**

- `address-validation.test.js`
- `create-category.test.js`

**Modified:**

- `jest.config.js` *(updated test path configuration)*

---

## BUG-A01: Lack of Containerisation

| Field | Detail |
|---|---|
| **Bug ID** | BUG-A01 |
| **Severity** | Medium |
| **Module** | Infrastructure / Developer Environment |
| **Status** | Fixed |

### Context

The application has two separate server processes — a Next.js frontend (port 3000) and a Node.js/Express backend (port 3001) — both depending on a MySQL database. Without containerisation, each contributor must manually install and configure compatible Node.js versions, a local MySQL instance, run two separate terminal processes, and manage their own `.env` files. This creates friction for onboarding and makes the environment inconsistent across machines.

### Root Cause

There was no Docker configuration in the project. Each service was documented as a manual setup step (see `README.md`), relying on the developer's local environment. Two dependency issues also existed that were invisible locally but would break an isolated container build:

- `dotenv` and `express-rate-limit` are used by the backend (`server/app.js` and `server/middleware/rateLimiter.js`) but were absent from `server/package.json`. They happened to resolve locally because Node.js walks up to the root `node_modules`, which contains them as frontend dependencies. An isolated container has no root `node_modules` to fall back to.

- `NEXT_PUBLIC_API_BASE_URL` is used as the backend API base URL for both server-side rendered (SSR) pages and browser-side client components. In a containerised environment, the value that works from the browser (`http://localhost:3001`) cannot reach the backend from inside the Next.js container — it would resolve to the container itself. There was no mechanism to use a different URL per context.

### Solution

Five files were created and three existing files were modified.

**`server/package.json`** — Added the two missing runtime dependencies so the backend installs everything it needs within its own isolated context.

```json
"dotenv": "^16.0.0",
"express-rate-limit": "^8.1.0"
```

**`lib/config.ts`** — Added a server/browser split so SSR calls use the Docker-internal service hostname and browser calls use the host-mapped port. When not running in Docker, both fall back to `http://localhost:3001`, so local development is unaffected.

```ts
const isServer = typeof window === 'undefined';

const config = {
  apiBaseUrl: isServer
    ? (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001')
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'),
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};
```

**`Dockerfile`** (frontend, project root) — Installs dependencies, copies source, and starts the Next.js dev server bound to `0.0.0.0` so the container's port is reachable via the host mapping.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "npx prisma generate && npx next dev --hostname 0.0.0.0"]
```

**`server/Dockerfile`** (backend) — Sets the working directory to `/app/server` so the relative upload path `../public/` resolves to `/app/public`, matching the shared volume mount. Runs `prisma migrate deploy` on startup to apply all migrations non-interactively before the server accepts requests.

```dockerfile
FROM node:20-alpine
WORKDIR /app/server
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN mkdir -p /app/public
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node app.js"]
```

**`docker-compose.yml`** — Defines three services with explicit dependency ordering and health checks. MySQL must pass its health check before the backend starts; the backend must pass its health check before the frontend starts. Both the frontend and backend bind-mount `./public` to `/app/public` so uploaded images are written to and served from the same host directory without duplication.

```yaml
services:
  mysql:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]

  backend:
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./public:/app/public   # upload target: ../public/ from /app/server = /app/public

  frontend:
    environment:
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001"   # browser
      BACKEND_INTERNAL_URL: "http://backend:3001"         # SSR / container-to-container
    depends_on:
      backend:
        condition: service_healthy
    volumes:
      - ./public:/app/public
```

**`.dockerignore`** and **`server/.dockerignore`** — Exclude `node_modules`, build artefacts, and test output from each build context to keep image layers small and prevent host dependencies from leaking into the container.

To start the full stack:

```bash
docker compose up --build
```

To seed demo data after the first run:

```bash
docker compose exec backend node utills/insertDemoData.js
```

### Files Affected

- `server/package.json` *(modified)*
- `lib/config.ts` *(modified)*
- `Dockerfile` *(created)*
- `server/Dockerfile` *(created)*
- `docker-compose.yml` *(created)*
- `.dockerignore` *(created)*
- `server/.dockerignore` *(created)*
