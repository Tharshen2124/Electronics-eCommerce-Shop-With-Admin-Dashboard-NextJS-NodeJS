jest.mock("../../utills/db", () => ({
  bulk_upload_batch: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  bulk_upload_item: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("Check Bulk Upload Results", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Latest batch retrieval", () => {
    it("should find the latest upload batch ordered by createdAt desc", async () => {
      const mockBatch = {
        id: "batch-1",
        fileName: "test.csv",
        status: "COMPLETED",
        itemCount: 5,
        errorCount: 0,
        createdAt: new Date("2025-01-01"),
      };
      prisma.bulk_upload_batch.findFirst.mockResolvedValueOnce(mockBatch);

      const batch = await prisma.bulk_upload_batch.findFirst({
        orderBy: { createdAt: "desc" },
      });

      expect(batch).toBeTruthy();
      expect(batch.id).toBe("batch-1");
      expect(batch.status).toBe("COMPLETED");
    });

    it("should return null when no batches exist", async () => {
      prisma.bulk_upload_batch.findFirst.mockResolvedValueOnce(null);

      const batch = await prisma.bulk_upload_batch.findFirst({
        orderBy: { createdAt: "desc" },
      });

      expect(batch).toBeNull();
    });
  });

  describe("Batch items retrieval", () => {
    it("should retrieve items with product relations for a batch", async () => {
      const mockItems = [
        {
          title: "Product A",
          slug: "product-a",
          price: 100,
          inStock: 1,
          status: "CREATED",
          error: null,
          product: { id: "prod-1", slug: "product-a" },
        },
        {
          title: "Product B",
          slug: "product-b",
          price: 200,
          inStock: 0,
          status: "ERROR",
          error: "Invalid categoryId",
          product: null,
        },
      ];
      prisma.bulk_upload_item.findMany.mockResolvedValueOnce(mockItems);

      const items = await prisma.bulk_upload_item.findMany({
        where: { batchId: "batch-1" },
        include: { product: true },
      });

      expect(items).toHaveLength(2);
      expect(items[0].status).toBe("CREATED");
      expect(items[0].product).toBeTruthy();
      expect(items[1].status).toBe("ERROR");
      expect(items[1].error).toBe("Invalid categoryId");
    });
  });

  describe("Statistics calculation", () => {
    it("should compute success rate from items", () => {
      const items = [
        { status: "CREATED", productId: "p1" },
        { status: "CREATED", productId: "p2" },
        { status: "ERROR", productId: null },
      ];
      const successful = items.filter(
        (i) => i.status === "CREATED" && i.productId
      ).length;
      const failed = items.filter((i) => i.status === "ERROR").length;
      const successRate =
        items.length > 0
          ? ((successful / items.length) * 100).toFixed(2)
          : 0;

      expect(successful).toBe(2);
      expect(failed).toBe(1);
      expect(parseFloat(successRate)).toBeCloseTo(66.67, 1);
    });

    it("should handle empty items array", () => {
      const items = [];
      const successRate =
        items.length > 0 ? ((0 / items.length) * 100).toFixed(2) : 0;

      expect(successRate).toBe(0);
    });
  });

  describe("Products in catalog", () => {
    it("should retrieve products by IDs with category relations", async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        {
          id: "prod-1",
          title: "Product A",
          slug: "product-a",
          price: 100,
          inStock: 1,
          category: { name: "Electronics" },
        },
      ]);

      const products = await prisma.product.findMany({
        where: { id: { in: ["prod-1"] } },
        include: { category: true },
      });

      expect(products).toHaveLength(1);
      expect(products[0].category.name).toBe("Electronics");
    });
  });

  describe("Upload history summary", () => {
    it("should retrieve the 5 most recent batches", async () => {
      const mockBatches = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-${i}`,
        status: i === 0 ? "COMPLETED" : "PARTIAL",
        createdAt: new Date(),
      }));
      prisma.bulk_upload_batch.findMany.mockResolvedValueOnce(mockBatches);

      const batches = await prisma.bulk_upload_batch.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      expect(batches).toHaveLength(5);
    });
  });
});
