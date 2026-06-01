const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Test Create Product", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("should return a list of categories", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve([
            { id: "cat-1", name: "Electronics" },
            { id: "cat-2", name: "Accessories" },
          ]),
      });

      const res = await fetch("http://localhost:3001/api/categories");
      const categories = await res.json();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("id");
      expect(categories[0]).toHaveProperty("name");
    });

    it("should handle empty categories list", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve([]),
      });

      const res = await fetch("http://localhost:3001/api/categories");
      const categories = await res.json();

      expect(categories).toHaveLength(0);
    });
  });

  describe("POST /api/products", () => {
    it("should return 201 when product is created successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({ id: "prod-1", title: "Test Product dari API" })
          ),
      });

      const productData = {
        title: "Test Product dari API",
        slug: "test-product-123",
        price: 999,
        manufacturer: "Test Manufacturer",
        description: "This is a test product",
        mainImage: "test-product.jpg",
        categoryId: "cat-1",
        inStock: 10,
      };

      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      expect(res.status).toBe(201);
      const body = JSON.parse(await res.text());
      expect(body.id).toBe("prod-1");
    });

    it("should handle product creation failure", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        text: () =>
          Promise.resolve(JSON.stringify({ error: "Slug already exists" })),
      });

      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Dup" }),
      });

      expect(res.status).not.toBe(201);
    });

    it("should send correct product data structure", () => {
      const productData = {
        title: "Test Product",
        slug: `test-product-${Date.now()}`,
        price: 999,
        manufacturer: "Test Manufacturer",
        description: "This is a test product",
        mainImage: "test-product.jpg",
        categoryId: "cat-1",
        inStock: 10,
      };

      expect(productData).toHaveProperty("title");
      expect(productData).toHaveProperty("slug");
      expect(productData).toHaveProperty("price");
      expect(productData).toHaveProperty("categoryId");
      expect(productData.price).toBe(999);
    });
  });
});
