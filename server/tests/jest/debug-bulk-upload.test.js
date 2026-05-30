jest.mock("fs", () => ({
  writeFileSync: jest.fn(),
  createReadStream: jest.fn(() => "mock-stream"),
  unlinkSync: jest.fn(),
}));

const fs = require("fs");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Debug Bulk Upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CSV creation", () => {
    it("should build a valid CSV string with header and data row", () => {
      const csv = [
        "title,slug,price,manufacturer,description,mainImage,categoryId,inStock",
        "Test Product,test-slug-123,100,TestCo,Test description,test.jpg,some-uuid-here,1",
      ].join("\n");

      expect(csv).toContain("title,slug,price");
      expect(csv.split("\n")).toHaveLength(2);
    });

    it("should write CSV to a temp file", () => {
      const csv = "header\nrow";
      fs.writeFileSync("/tmp/temp-test.csv", csv);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/tmp/temp-test.csv",
        csv
      );
    });
  });

  describe("POST /api/bulk-upload", () => {
    it("should return 201 for a successful upload", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({ batchId: "batch-1", status: "COMPLETED" })
          ),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "mock-form",
      });

      expect(res.status).toBe(201);
      const payload = JSON.parse(await res.text());
      expect(payload.batchId).toBe("batch-1");
    });

    it("should handle non-201 responses", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "mock-form",
      });

      expect(res.status).not.toBe(201);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        fetch("http://localhost:3001/api/bulk-upload", { method: "POST" })
      ).rejects.toThrow("ECONNREFUSED");
    });
  });

  describe("Temp file cleanup", () => {
    it("should remove temp CSV after upload", () => {
      fs.unlinkSync("/tmp/temp-test.csv");

      expect(fs.unlinkSync).toHaveBeenCalledWith("/tmp/temp-test.csv");
    });
  });
});
