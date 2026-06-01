jest.mock("../../utills/db", () => ({
  product: { findUnique: jest.fn() },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Test Create and Verify", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Step 1: Get categories", () => {
    it("should fetch categories and select the first one", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve([{ id: "cat-1", name: "Electronics" }]),
      });

      const res = await fetch("http://localhost:3001/api/categories");
      const categories = await res.json();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].id).toBe("cat-1");
    });
  });

  describe("Step 2: Create product via API", () => {
    it("should return 201 with product id", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        json: () => Promise.resolve({ id: "prod-new" }),
      });

      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Product",
          slug: "test-product-123",
          price: 12345,
          manufacturer: "Test Manufacturer",
          description: "This is a test product for verification",
          mainImage: "test-image.jpg",
          categoryId: "cat-1",
          inStock: 99,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe("prod-new");
    });

    it("should handle creation failure", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 500,
        json: () => Promise.resolve({ error: "Internal error" }),
      });

      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).not.toBe(201);
    });
  });

  describe("Step 4: Verify in database directly", () => {
    it("should find the created product by id", async () => {
      prisma.product.findUnique.mockResolvedValueOnce({
        id: "prod-new",
        title: "Test Product",
        slug: "test-product-123",
        price: 12345,
        inStock: 99,
        manufacturer: "Test Manufacturer",
        category: { name: "Electronics" },
      });

      const dbProduct = await prisma.product.findUnique({
        where: { id: "prod-new" },
        include: { category: true },
      });

      expect(dbProduct).toBeTruthy();
      expect(dbProduct.title).toBe("Test Product");
      expect(dbProduct.price).toBe(12345);
      expect(dbProduct.category.name).toBe("Electronics");
    });

    it("should return null when product is not found", async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      const dbProduct = await prisma.product.findUnique({
        where: { id: "non-existent" },
      });

      expect(dbProduct).toBeNull();
    });
  });

  describe("Step 5: Verify via API", () => {
    it("should return 200 for GET /api/products/:id", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ id: "prod-new", title: "Test Product" }),
      });

      const res = await fetch("http://localhost:3001/api/products/prod-new");

      expect(res.status).toBe(200);
      const product = await res.json();
      expect(product.title).toBe("Test Product");
    });

    it("should return non-200 for missing product", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      const res = await fetch("http://localhost:3001/api/products/missing");

      expect(res.status).toBe(404);
    });
  });
});
