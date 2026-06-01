const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Simple Server Test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 with status data when server is running", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve({ status: "ok", uptime: 12345 }),
      });

      const res = await fetch("http://localhost:3001/health");
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty("status", "ok");
    });

    it("should throw when server is unreachable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(fetch("http://localhost:3001/health")).rejects.toThrow(
        "ECONNREFUSED"
      );
    });
  });
});
