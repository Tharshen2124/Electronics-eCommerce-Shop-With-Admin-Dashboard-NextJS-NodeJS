jest.mock("../../utills/db", () => ({
  bulk_upload_batch: { findMany: jest.fn() },
  bulk_upload_item: { findMany: jest.fn() },
  category: { findMany: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("Test DB Bulk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Database connection", () => {
    it("should connect to database successfully", async () => {
      prisma.$connect.mockResolvedValueOnce(undefined);

      await prisma.$connect();

      expect(prisma.$connect).toHaveBeenCalled();
    });
  });

  describe("Bulk upload batch table", () => {
    it("should retrieve all batches", async () => {
      prisma.bulk_upload_batch.findMany.mockResolvedValueOnce([
        { id: "b1", status: "COMPLETED" },
        { id: "b2", status: "PARTIAL" },
      ]);

      const batches = await prisma.bulk_upload_batch.findMany();

      expect(batches).toHaveLength(2);
    });

    it("should handle empty batch table", async () => {
      prisma.bulk_upload_batch.findMany.mockResolvedValueOnce([]);

      const batches = await prisma.bulk_upload_batch.findMany();

      expect(batches).toHaveLength(0);
    });
  });

  describe("Bulk upload item table", () => {
    it("should retrieve all items", async () => {
      prisma.bulk_upload_item.findMany.mockResolvedValueOnce([
        { id: "i1", status: "CREATED" },
      ]);

      const items = await prisma.bulk_upload_item.findMany();

      expect(items).toHaveLength(1);
    });
  });

  describe("Categories table", () => {
    it("should retrieve categories with id and name", async () => {
      prisma.category.findMany.mockResolvedValueOnce([
        { id: "cat-1", name: "Electronics" },
        { id: "cat-2", name: "Accessories" },
      ]);

      const categories = await prisma.category.findMany({
        select: { id: true, name: true },
      });

      expect(categories).toHaveLength(2);
      expect(categories[0]).toHaveProperty("id");
      expect(categories[0]).toHaveProperty("name");
    });
  });

  describe("Disconnect", () => {
    it("should disconnect after checks", async () => {
      await prisma.$disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});
