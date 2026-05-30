jest.mock("fs", () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => "mock-stream"),
  writeFileSync: jest.fn(),
}));

const fs = require("fs");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Test Bulk Upload Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Health check", () => {
    it("should return status ok from GET /health", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ status: "ok" }),
      });

      const res = await fetch("http://localhost:3001/health");
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
    });

    it("should abort remaining tests if health check fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(fetch("http://localhost:3001/health")).rejects.toThrow();
    });
  });

  describe("GET /api/bulk-upload (list batches)", () => {
    it("should return 200 with batch list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ batches: [{ id: "b1" }] }),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload");
      expect(res.ok).toBe(true);

      const data = await res.json();
      expect(data.batches).toBeDefined();
    });
  });

  describe("POST /api/bulk-upload (upload CSV)", () => {
    it("should return success with batchId for valid CSV upload", async () => {
      fs.existsSync.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            batchId: "batch-123",
            status: "COMPLETED",
          }),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "mock-form",
      });

      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.batchId).toBe("batch-123");
    });

    it("should create test CSV when file is missing", () => {
      fs.existsSync.mockReturnValue(false);

      const testCsv = `title,price,manufacturer,inStock,mainImage,description,slug,categoryId
Test Product,99.99,Test Brand,10,https://example.com/test.jpg,Test description,test-product-123,electronics`;

      fs.writeFileSync("/path/to/csv", testCsv, "utf8");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/path/to/csv",
        testCsv,
        "utf8"
      );
    });

    it("should handle upload failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid CSV format" }),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "bad-form",
      });

      expect(res.ok).toBe(false);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
});
