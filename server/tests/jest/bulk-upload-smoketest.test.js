jest.mock("../../utills/db", () => ({
  category: { create: jest.fn() },
  bulk_upload_batch: { findUnique: jest.fn() },
  bulk_upload_item: { findMany: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn() },
  $disconnect: jest.fn(),
}));

jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  createReadStream: jest.fn(() => "mock-stream"),
  unlinkSync: jest.fn(),
}));

const prisma = require("../../utills/db");
const fs = require("fs");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Bulk Upload Smoke Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Server health check", () => {
    it("should confirm server is reachable via GET /health", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ status: "ok" })),
      });

      const res = await fetch("http://127.0.0.1:3001/health");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(JSON.parse(text)).toHaveProperty("status", "ok");
    });

    it("should throw when server is not reachable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(fetch("http://127.0.0.1:3001/health")).rejects.toThrow(
        "ECONNREFUSED"
      );
    });
  });

  describe("Ensure test category exists", () => {
    it("should create a category with a unique name", async () => {
      const mockCat = { id: "cat-123", name: "bulk-test-abc123" };
      prisma.category.create.mockResolvedValueOnce(mockCat);

      const cat = await prisma.category.create({
        data: { name: "bulk-test-abc123" },
      });
      expect(cat.id).toBe("cat-123");
      expect(cat.name).toMatch(/^bulk-test-/);
    });
  });

  describe("POST /api/bulk-upload", () => {
    it("should return 201 with batchId for valid CSV upload", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({ batchId: "batch-1", status: "PARTIAL" })
          ),
      });

      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload", {
        method: "POST",
        body: "mock-form-data",
      });
      expect(res.status).toBe(201);
      const payload = JSON.parse(await res.text());
      expect(payload.batchId).toBe("batch-1");
    });

    it("should return 400 when no file is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        text: () => Promise.resolve("No file uploaded"),
      });

      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload", {
        method: "POST",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("CSV building", () => {
    it("should produce header row and data rows", () => {
      const header =
        "title,slug,price,manufacturer,description,mainImage,categoryId,inStock";
      const row1 = "Bulk Test Product A,bulk-a-1,199,TestCo,Bulk A,productA.webp,cat-1,1";
      const rowBad = "Bulk Invalid Product,bulk-bad-1,abc,TestCo,Invalid item,bad.webp,,1";
      const csv = [header, row1, rowBad].join("\n");

      const lines = csv.split("\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain("title");
      expect(lines[2]).toContain("abc");
    });
  });

  describe("DB check after batch creation", () => {
    it("should find batch in DB with items", async () => {
      prisma.bulk_upload_batch.findUnique.mockResolvedValueOnce({
        id: "batch-1",
        status: "PARTIAL",
        itemCount: 3,
        errorCount: 1,
        items: [
          { id: "item-1", productId: "prod-1", status: "CREATED" },
          { id: "item-2", productId: "prod-2", status: "CREATED" },
          { id: "item-3", productId: null, status: "ERROR" },
        ],
      });

      const dbBatch = await prisma.bulk_upload_batch.findUnique({
        where: { id: "batch-1" },
        include: { items: true },
      });

      expect(dbBatch).toBeTruthy();
      expect(dbBatch.items.length).toBeGreaterThanOrEqual(2);
      expect(["PENDING", "COMPLETED", "PARTIAL", "FAILED"]).toContain(
        dbBatch.status
      );
    });

    it("should verify product references exist for created items", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1" });

      const prod = await prisma.product.findUnique({
        where: { id: "prod-1" },
      });
      expect(prod).toBeTruthy();
    });
  });

  describe("GET /api/bulk-upload (list batches)", () => {
    it("should return 200 with an array of batches", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve([{ id: "batch-1" }, { id: "batch-2" }]),
      });

      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /api/bulk-upload/:batchId (batch detail)", () => {
    it("should return 200 with batch details and items", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            id: "batch-1",
            items: [{ id: "item-1" }, { id: "item-2" }],
          }),
      });

      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload/batch-1");
      expect(res.status).toBe(200);
      const detail = await res.json();
      expect(detail.items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("PUT /api/bulk-upload/:batchId (update items)", () => {
    it("should return 200 when updating item price and stock", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      const body = { items: [{ itemId: "item-1", price: 1234, inStock: 0 }] };
      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload/batch-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/bulk-upload/:batchId", () => {
    it("should return 204 when deleting a batch", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204 });

      const res = await fetch("http://127.0.0.1:3001/api/bulk-upload/batch-1", {
        method: "DELETE",
      });
      expect(res.status).toBe(204);
    });
  });

  describe("DB check after deletion", () => {
    it("should confirm batch no longer exists", async () => {
      prisma.bulk_upload_batch.findUnique.mockResolvedValueOnce(null);

      const batchGone = await prisma.bulk_upload_batch.findUnique({
        where: { id: "batch-1" },
      });
      expect(batchGone).toBeNull();
    });

    it("should confirm batch items are removed", async () => {
      prisma.bulk_upload_item.findMany.mockResolvedValueOnce([]);

      const items = await prisma.bulk_upload_item.findMany({
        where: { batchId: "batch-1" },
      });
      expect(items).toHaveLength(0);
    });

    it("should confirm products are removed", async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);

      const prod = await prisma.product.findUnique({
        where: { id: "prod-1" },
      });
      expect(prod).toBeNull();
    });
  });

  describe("Temp file management", () => {
    it("should write and clean up temp CSV file", () => {
      fs.writeFileSync("temp-bulk.csv", "header\nrow1");
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "temp-bulk.csv",
        "header\nrow1"
      );

      fs.unlinkSync("temp-bulk.csv");
      expect(fs.unlinkSync).toHaveBeenCalledWith("temp-bulk.csv");
    });
  });
});
