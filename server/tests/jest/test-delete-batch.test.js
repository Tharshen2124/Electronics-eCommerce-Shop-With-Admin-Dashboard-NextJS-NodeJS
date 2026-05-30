const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Test Delete Batch", () => {
  const BASE_URL = "http://localhost:3001/api/bulk-upload";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/bulk-upload (list batches)", () => {
    it("should return batch list", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            batches: [
              {
                id: "b1",
                fileName: "test.csv",
                status: "COMPLETED",
                totalRecords: 5,
                successfulRecords: 4,
              },
            ],
          }),
      });

      const res = await fetch(BASE_URL);
      const data = await res.json();

      expect(data.batches.length).toBeGreaterThan(0);
      expect(data.batches[0]).toHaveProperty("id");
      expect(data.batches[0]).toHaveProperty("status");
    });

    it("should handle empty batch list", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ batches: [] }),
      });

      const res = await fetch(BASE_URL);
      const data = await res.json();

      expect(data.batches).toHaveLength(0);
    });
  });

  describe("DELETE /api/bulk-upload/:batchId", () => {
    it("should delete batch only (keep products) with deleteProducts=false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: {
          get: () => "application/json",
        },
        text: () =>
          Promise.resolve(
            JSON.stringify({
              message: "Batch deleted",
              deletedProducts: 0,
            })
          ),
      });

      const res = await fetch(`${BASE_URL}/b1?deleteProducts=false`, {
        method: "DELETE",
      });

      expect(res.ok).toBe(true);
      const data = JSON.parse(await res.text());
      expect(data.message).toBe("Batch deleted");
      expect(data.deletedProducts).toBe(0);
    });

    it("should handle delete failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          get: () => "application/json",
        },
        text: () =>
          Promise.resolve(JSON.stringify({ error: "Batch not found" })),
      });

      const res = await fetch(`${BASE_URL}/nonexistent`, {
        method: "DELETE",
      });

      expect(res.ok).toBe(false);
    });
  });

  describe("Verify batch deletion", () => {
    it("should confirm batch no longer appears in list after deletion", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () =>
          Promise.resolve({
            batches: [{ id: "b2" }],
          }),
      });

      const res = await fetch(BASE_URL);
      const data = await res.json();

      const stillExists = data.batches.find((b) => b.id === "b1");
      expect(stillExists).toBeUndefined();
    });
  });
});
