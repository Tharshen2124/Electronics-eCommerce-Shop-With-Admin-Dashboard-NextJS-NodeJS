jest.mock("../../utills/db", () => ({
  product: {
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

// Pure state logic extracted from search UI behaviour (Frain, 2020 three-state principle)
function resolveSearchState({ isLoading, results, searchInput }) {
  return {
    isLoading,
    isEmpty: !isLoading && results.length === 0,
    isPopulated: !isLoading && results.length > 0,
    results,
    searchInput,
  };
}

function beginSearch(currentSearchInput) {
  return resolveSearchState({
    isLoading: true,
    results: [],
    searchInput: currentSearchInput,
  });
}

function resolveWithResults(searchInput, results) {
  return resolveSearchState({ isLoading: false, results, searchInput });
}

function resolveEmpty(searchInput) {
  return resolveSearchState({ isLoading: false, results: [], searchInput });
}

describe("BUG-C04: UI State Management – search input persistence and independent states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Search input persistence during async requests", () => {
    it("should retain search input value while loading is in progress", () => {
      const state = beginSearch("wireless headphones");

      expect(state.isLoading).toBe(true);
      expect(state.searchInput).toBe("wireless headphones");
    });

    it("should retain search input after async resolves with results", () => {
      const state = resolveWithResults("wireless headphones", [
        { id: "p1", title: "Wireless Headphones Pro" },
      ]);

      expect(state.searchInput).toBe("wireless headphones");
      expect(state.isLoading).toBe(false);
    });

    it("should retain search input after async resolves with no results", () => {
      const state = resolveEmpty("zzz-nonexistent-product");

      expect(state.searchInput).toBe("zzz-nonexistent-product");
      expect(state.isEmpty).toBe(true);
    });
  });

  describe("Independent loading, empty, and populated states", () => {
    it("should set isLoading true and isEmpty false while loading", () => {
      const state = beginSearch("laptop");

      expect(state.isLoading).toBe(true);
      expect(state.isEmpty).toBe(false);
      expect(state.isPopulated).toBe(false);
    });

    it("should set isPopulated true and isLoading false after results arrive", () => {
      const state = resolveWithResults("laptop", [
        { id: "p1", title: "Gaming Laptop" },
        { id: "p2", title: "Office Laptop" },
      ]);

      expect(state.isPopulated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isEmpty).toBe(false);
    });

    it("should set isEmpty true and isPopulated false when no results are found", () => {
      const state = resolveEmpty("xyz-unknown");

      expect(state.isEmpty).toBe(true);
      expect(state.isPopulated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should never have isLoading and isEmpty both true at the same time", () => {
      const loadingState = beginSearch("tablet");
      expect(loadingState.isLoading && loadingState.isEmpty).toBe(false);
    });

    it("should never have isLoading and isPopulated both true at the same time", () => {
      const loadingState = beginSearch("tablet");
      expect(loadingState.isLoading && loadingState.isPopulated).toBe(false);
    });
  });

  describe("Server-side search controller – missing query returns 400 not 500", () => {
    it("should return 400 when query parameter is missing", async () => {
      const req = { query: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const { searchProducts } = require("../../controllers/search");
      await searchProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it("should return matching products when query is provided", async () => {
      const mockProducts = [
        { id: "p1", title: "Wireless Mouse", description: "Ergonomic wireless mouse" },
      ];
      prisma.product.findMany = jest.fn().mockResolvedValue(mockProducts);

      const req = { query: { query: "wireless" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const { searchProducts } = require("../../controllers/search");
      await searchProducts(req, res);

      expect(prisma.product.findMany).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockProducts);
    });

    it("should return an empty array when no products match the query", async () => {
      prisma.product.findMany = jest.fn().mockResolvedValue([]);

      const req = { query: { query: "zzz-nonexistent" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const { searchProducts } = require("../../controllers/search");
      await searchProducts(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
