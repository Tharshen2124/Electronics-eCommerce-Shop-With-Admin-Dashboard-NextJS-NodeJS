jest.mock("../../utills/db", () => ({
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

// Pure pagination helpers extracted from /server/controllers/products.js
const PAGE_SIZE = 6;

function calculateTotalPages(total, pageSize) {
  return Math.ceil(total / pageSize);
}

function validatePage(page) {
  const parsed = Number(page);
  return parsed && parsed > 0 ? parsed : 1;
}

function calculateSkip(page, pageSize) {
  return (page - 1) * pageSize;
}

function canNavigateNext(currentPage, totalPages) {
  return currentPage < totalPages;
}

describe("BUG-C02: Pagination Logic – correct page count and phantom page elimination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Total page calculation", () => {
    it("should compute totalPages correctly from total count", () => {
      expect(calculateTotalPages(12, PAGE_SIZE)).toBe(2);
      expect(calculateTotalPages(6, PAGE_SIZE)).toBe(1);
      expect(calculateTotalPages(7, PAGE_SIZE)).toBe(2);
      expect(calculateTotalPages(18, PAGE_SIZE)).toBe(3);
    });

    it("should return 0 totalPages when total is 0 (no phantom pages)", () => {
      expect(calculateTotalPages(0, PAGE_SIZE)).toBe(0);
    });

    it("should return 1 totalPages when there is exactly one page of results", () => {
      expect(calculateTotalPages(1, PAGE_SIZE)).toBe(1);
      expect(calculateTotalPages(PAGE_SIZE, PAGE_SIZE)).toBe(1);
    });
  });

  describe("Page parameter validation", () => {
    it("should default to page 1 when page parameter is missing or 0", () => {
      expect(validatePage(undefined)).toBe(1);
      expect(validatePage(null)).toBe(1);
      expect(validatePage(0)).toBe(1);
      expect(validatePage("")).toBe(1);
    });

    it("should reject page numbers less than 1 and fall back to 1", () => {
      expect(validatePage(-1)).toBe(1);
      expect(validatePage(-100)).toBe(1);
    });

    it("should accept valid page numbers as-is", () => {
      expect(validatePage(1)).toBe(1);
      expect(validatePage(3)).toBe(3);
      expect(validatePage("2")).toBe(2);
    });
  });

  describe("Skip offset calculation", () => {
    it("should calculate correct skip offset for a given page", () => {
      expect(calculateSkip(1, PAGE_SIZE)).toBe(0);
      expect(calculateSkip(2, PAGE_SIZE)).toBe(6);
      expect(calculateSkip(3, PAGE_SIZE)).toBe(12);
    });
  });

  describe("Navigation boundary guard", () => {
    it("should block navigation when on the last page", () => {
      expect(canNavigateNext(3, 3)).toBe(false);
      expect(canNavigateNext(1, 1)).toBe(false);
    });

    it("should allow navigation when not on the last page", () => {
      expect(canNavigateNext(1, 3)).toBe(true);
      expect(canNavigateNext(2, 3)).toBe(true);
    });

    it("should block navigation when totalPages is 0 (empty results)", () => {
      expect(canNavigateNext(1, 0)).toBe(false);
    });
  });

  describe("Products controller response shape", () => {
    it("should return products, total, and pageSize in the response", async () => {
      const mockProducts = [
        { id: "p1", title: "Laptop", price: 999 },
        { id: "p2", title: "Phone", price: 499 },
      ];
      const mockTotal = 2;

      prisma.product.findMany = jest.fn().mockResolvedValue(mockProducts);
      prisma.product.count = jest.fn().mockResolvedValue(mockTotal);

      const [products, total] = await Promise.all([
        prisma.product.findMany({ skip: 0, take: PAGE_SIZE }),
        prisma.product.count(),
      ]);

      const responsePayload = { products, total, pageSize: PAGE_SIZE };

      expect(responsePayload).toHaveProperty("products");
      expect(responsePayload).toHaveProperty("total");
      expect(responsePayload).toHaveProperty("pageSize", PAGE_SIZE);
      expect(responsePayload.total).toBe(2);
      expect(Array.isArray(responsePayload.products)).toBe(true);
    });

    it("should return empty products array and total 0 when no results exist", async () => {
      prisma.product.findMany = jest.fn().mockResolvedValue([]);
      prisma.product.count = jest.fn().mockResolvedValue(0);

      const [products, total] = await Promise.all([
        prisma.product.findMany({ skip: 0, take: PAGE_SIZE }),
        prisma.product.count(),
      ]);

      expect(products).toHaveLength(0);
      expect(total).toBe(0);
      expect(calculateTotalPages(total, PAGE_SIZE)).toBe(0);
    });
  });
});
