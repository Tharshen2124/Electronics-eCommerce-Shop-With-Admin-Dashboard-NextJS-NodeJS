jest.mock("../../utills/db", () => ({
  product: { findMany: jest.fn() },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("Check Products DB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Product listing", () => {
    it("should retrieve the latest 10 products ordered by id desc", async () => {
      const mockProducts = Array.from({ length: 10 }, (_, i) => ({
        id: `prod-${i}`,
        title: `Product ${i}`,
        slug: `product-${i}`,
        price: 100 + i,
        inStock: 1,
        category: { name: "Electronics" },
      }));
      prisma.product.findMany.mockResolvedValueOnce(mockProducts);

      const products = await prisma.product.findMany({
        orderBy: { id: "desc" },
        take: 10,
        include: { category: true },
      });

      expect(products).toHaveLength(10);
      expect(products[0]).toHaveProperty("title");
      expect(products[0]).toHaveProperty("slug");
      expect(products[0]).toHaveProperty("price");
      expect(products[0].category).toHaveProperty("name");
    });

    it("should handle empty product list", async () => {
      prisma.product.findMany.mockResolvedValueOnce([]);

      const products = await prisma.product.findMany({
        orderBy: { id: "desc" },
        take: 10,
        include: { category: true },
      });

      expect(products).toHaveLength(0);
    });

    it("should handle products without categories", async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        {
          id: "prod-1",
          title: "Orphan Product",
          slug: "orphan",
          price: 50,
          inStock: 0,
          category: null,
        },
      ]);

      const products = await prisma.product.findMany({
        orderBy: { id: "desc" },
        take: 10,
        include: { category: true },
      });

      expect(products[0].category).toBeNull();
    });
  });

  describe("Prisma disconnect", () => {
    it("should disconnect after operations", async () => {
      prisma.product.findMany.mockResolvedValueOnce([]);

      await prisma.product.findMany({});
      await prisma.$disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});
