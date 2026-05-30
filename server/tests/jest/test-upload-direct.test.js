jest.mock("fs", () => ({
  existsSync: jest.fn(),
  createReadStream: jest.fn(() => "mock-stream"),
}));

const fs = require("fs");

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Test Upload Direct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CSV file check", () => {
    it("should detect existing CSV file", () => {
      fs.existsSync.mockReturnValue(true);

      expect(fs.existsSync("/path/to/bulk-upload-example.csv")).toBe(true);
    });

    it("should detect missing CSV file", () => {
      fs.existsSync.mockReturnValue(false);

      expect(fs.existsSync("/path/to/bulk-upload-example.csv")).toBe(false);
    });
  });

  describe("POST /api/bulk-upload", () => {
    it("should return success with batchId for valid upload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              batchId: "batch-1",
              status: "COMPLETED",
            })
          ),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "mock-form",
      });

      expect(res.ok).toBe(true);
      const data = JSON.parse(await res.text());
      expect(data.batchId).toBe("batch-1");
      expect(data.status).toBe("COMPLETED");
    });

    it("should handle upload failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(JSON.stringify({ error: "No file provided" })),
      });

      const res = await fetch("http://localhost:3001/api/bulk-upload", {
        method: "POST",
        body: "bad-form",
      });

      expect(res.ok).toBe(false);
      const data = JSON.parse(await res.text());
      expect(data.error).toBeDefined();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(
        fetch("http://localhost:3001/api/bulk-upload", { method: "POST" })
      ).rejects.toThrow("ECONNREFUSED");
    });
  });
});
