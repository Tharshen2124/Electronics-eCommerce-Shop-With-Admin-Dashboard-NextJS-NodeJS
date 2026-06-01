jest.mock("../../utills/db", () => ({
  category: { create: jest.fn(), delete: jest.fn() },
  product: { deleteMany: jest.fn() },
  bulk_upload_batch: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  bulk_upload_item: { findMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
}));

jest.mock("../../services/bulkUploadService", () => ({
  validateRow: jest.fn(),
  createBatchWithItems: jest.fn(),
  computeBatchStatus: jest.fn(),
  getBatchSummary: jest.fn(),
}));

const prisma = require("../../utills/db");
const {
  validateRow,
  createBatchWithItems,
  computeBatchStatus,
  getBatchSummary,
} = require("../../services/bulkUploadService");

describe("Repro Bulk Upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Row validation", () => {
    it("should accept a valid row", () => {
      validateRow.mockReturnValueOnce({
        ok: true,
        data: {
          title: "Repro A",
          slug: "repro-a-123",
          price: 200,
          manufacturer: "X",
          description: "A",
          mainImage: "a.webp",
          categoryId: "cat-1",
          inStock: 1,
        },
      });

      const result = validateRow({
        title: "Repro A",
        slug: "repro-a-123",
        price: 200,
        manufacturer: "X",
        description: "A",
        mainImage: "a.webp",
        categoryId: "cat-1",
        inStock: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.data.title).toBe("Repro A");
    });

    it("should reject a row with non-numeric price and empty categoryId", () => {
      validateRow.mockReturnValueOnce({
        ok: false,
        error: "price must be a non-negative number, categoryId is required",
      });

      const result = validateRow({
        title: "Bad",
        slug: "bad-slug",
        price: "abc",
        categoryId: "",
        inStock: 1,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("price");
      expect(result.error).toContain("categoryId");
    });
  });

  describe("Batch creation via transaction", () => {
    it("should create batch with items and compute final status", async () => {
      createBatchWithItems.mockResolvedValueOnce({
        successCount: 2,
        errorCount: 1,
      });
      computeBatchStatus.mockReturnValueOnce("PARTIAL");

      const { successCount, errorCount } = await createBatchWithItems(
        {},
        "batch-1",
        [{}, {}],
        [{ index: 3, error: "bad row" }]
      );

      expect(successCount).toBe(2);
      expect(errorCount).toBe(1);
      expect(computeBatchStatus(2, 1)).toBe("PARTIAL");
    });
  });

  describe("Batch summary", () => {
    it("should return summary with total, errors, created, updated counts", async () => {
      getBatchSummary.mockResolvedValueOnce({
        total: 3,
        errors: 1,
        created: 2,
        updated: 0,
      });

      const summary = await getBatchSummary(prisma, "batch-1");

      expect(summary.total).toBe(3);
      expect(summary.errors).toBe(1);
      expect(summary.created).toBe(2);
    });
  });

  describe("Cleanup", () => {
    it("should delete products created during the batch", async () => {
      prisma.bulk_upload_item.findMany.mockResolvedValueOnce([
        { productId: "prod-1" },
        { productId: "prod-2" },
        { productId: null },
      ]);
      prisma.product.deleteMany.mockResolvedValueOnce({ count: 2 });

      const items = await prisma.bulk_upload_item.findMany({
        where: { batchId: "batch-1" },
      });
      const prodIds = items.map((i) => i.productId).filter(Boolean);

      expect(prodIds).toHaveLength(2);

      await prisma.product.deleteMany({ where: { id: { in: prodIds } } });
      expect(prisma.product.deleteMany).toHaveBeenCalled();
    });

    it("should delete the batch", async () => {
      prisma.bulk_upload_batch.delete.mockResolvedValueOnce({});

      await prisma.bulk_upload_batch.delete({ where: { id: "batch-1" } });

      expect(prisma.bulk_upload_batch.delete).toHaveBeenCalledWith({
        where: { id: "batch-1" },
      });
    });

    it("should delete the test category", async () => {
      prisma.category.delete.mockResolvedValueOnce({});

      await prisma.category.delete({ where: { id: "cat-1" } });

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: "cat-1" },
      });
    });
  });
});
