/**
 * F002 — Product Browsing & Discovery
 *
 * Unit tests covering filter combination logic (DT) and browsing/sorting
 * workflows (UC).
 *
 * Source files under test:
 *   - controllers/products.js → validateFilterType, validateOperator,
 *     validateSortValue, validateAndSanitizeFilterValue, buildSafeFilterObject
 */

// ---------------------------------------------------------------------------
// Mock Prisma (products.js imports ../utills/db at module level)
// ---------------------------------------------------------------------------
jest.mock('../utills/db', () => ({
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const {
  validateFilterType,
  validateOperator,
  validateSortValue,
  validateAndSanitizeFilterValue,
  buildSafeFilterObject,
  getAllProducts,
} = require('../controllers/products');

const prisma = require('../utills/db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockReq = (query = {}, url = '/api/products') => ({
  query,
  url,
  method: 'GET',
  path: '/api/products',
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// ---------------------------------------------------------------------------
// F002 Tests
// ---------------------------------------------------------------------------
describe('F002 - Product Browsing & Discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Decision Table — Filter Combination Logic
  // =========================================================================
  describe('Decision Table - Filter Combination Logic', () => {
    // TC-02-DT-001: Price filter only applied (no rating, no in-stock filter)
    test('builds filter object with price filter only', () => {
      const filterArray = [
        { filterType: 'price', filterOperator: 'lte', filterValue: 100 },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({ price: { lte: 100 } });
      expect(result).not.toHaveProperty('rating');
      expect(result).not.toHaveProperty('inStock');
    });

    // TC-02-DT-002: Price + rating filters combined
    test('builds filter object with price and rating filters', () => {
      const filterArray = [
        { filterType: 'price', filterOperator: 'lte', filterValue: 200 },
        { filterType: 'rating', filterOperator: 'gte', filterValue: 4 },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({
        price: { lte: 200 },
        rating: { gte: 4 },
      });
    });

    // TC-02-DT-003: Price + rating + in-stock filters combined
    test('builds filter object with price, rating, and inStock filters', () => {
      const filterArray = [
        { filterType: 'price', filterOperator: 'lte', filterValue: 150 },
        { filterType: 'rating', filterOperator: 'gte', filterValue: 3 },
        { filterType: 'inStock', filterOperator: 'gte', filterValue: 1 },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({
        price: { lte: 150 },
        rating: { gte: 3 },
        inStock: { gte: 1 },
      });
    });

    // TC-02-DT-004: All filters active but no matching items → show empty message
    test('returns empty result when filters match no products', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const req = mockReq({ page: '1' }, '/api/products?page=1');
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [],
          total: 0,
        })
      );
    });
  });

  // =========================================================================
  // Use Case — Browsing and Sorting Logic
  // =========================================================================
  describe('Use Case - Browsing and Sorting Logic', () => {
    // TC-02-UC-001: Main Flow – Browse by category (Headphones)
    test('filters products by category "Headphones"', () => {
      const filterArray = [
        {
          filterType: 'category',
          filterOperator: 'equals',
          filterValue: 'Headphones',
        },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({
        category: { equals: 'Headphones' },
      });
    });

    // TC-02-UC-002: Alternate Flow 1 – Filter by availability (In Stock only)
    test('filters products by inStock', () => {
      expect(validateFilterType('inStock')).toBe(true);

      const filterArray = [
        { filterType: 'inStock', filterOperator: 'gte', filterValue: 1 },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({ inStock: { gte: 1 } });
    });

    // TC-02-UC-003: Alternate Flow 1 – Filter by availability (Out of Stock only)
    test('filters products by outOfStock', () => {
      expect(validateFilterType('outOfStock')).toBe(true);

      const filterArray = [
        { filterType: 'outOfStock', filterOperator: 'equals', filterValue: 0 },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toEqual({ outOfStock: { equals: 0 } });
    });

    // TC-02-UC-004: Alternate Flow 2 – Filter by max price ($40)
    test('filters products by maximum price $40', () => {
      const sanitized = validateAndSanitizeFilterValue('price', '40');
      expect(sanitized).toBe(40);

      const filterArray = [
        { filterType: 'price', filterOperator: 'lte', filterValue: 40 },
      ];
      const result = buildSafeFilterObject(filterArray);
      expect(result).toEqual({ price: { lte: 40 } });
    });

    // TC-02-UC-005: Alternate Flow 3 – Filter by minimum rating (5 stars)
    test('filters products by minimum rating 5', () => {
      const sanitized = validateAndSanitizeFilterValue('rating', '5');
      expect(sanitized).toBe(5);

      const filterArray = [
        { filterType: 'rating', filterOperator: 'gte', filterValue: 5 },
      ];
      const result = buildSafeFilterObject(filterArray);
      expect(result).toEqual({ rating: { gte: 5 } });
    });

    // TC-02-UC-006: Alternate Flow 4 – Sort products A-Z
    test('validates sort value "titleAsc"', () => {
      expect(validateSortValue('titleAsc')).toBe(true);
    });

    // TC-02-UC-007: Alternate Flow 5 – Sort products Z-A
    test('validates sort value "titleDesc"', () => {
      expect(validateSortValue('titleDesc')).toBe(true);
    });

    // TC-02-UC-008: Alternate Flow 6 – Sort by lowest price
    test('validates sort value "lowPrice"', () => {
      expect(validateSortValue('lowPrice')).toBe(true);
    });

    // TC-02-UC-009: Alternate Flow 7 – Sort by highest price
    test('validates sort value "highPrice"', () => {
      expect(validateSortValue('highPrice')).toBe(true);
    });

    // TC-02-UC-010: Alternate Flow 8 – Multiple filters and sort applied simultaneously
    test('builds filter object with multiple filters and validates sort', () => {
      const filterArray = [
        { filterType: 'price', filterOperator: 'lte', filterValue: 500 },
        { filterType: 'rating', filterOperator: 'gte', filterValue: 4 },
        { filterType: 'inStock', filterOperator: 'gte', filterValue: 1 },
        {
          filterType: 'category',
          filterOperator: 'equals',
          filterValue: 'Headphones',
        },
      ];
      const result = buildSafeFilterObject(filterArray);

      expect(result).toHaveProperty('price');
      expect(result).toHaveProperty('rating');
      expect(result).toHaveProperty('inStock');
      expect(result).toHaveProperty('category');

      // Sort validation alongside filters
      expect(validateSortValue('lowPrice')).toBe(true);
      expect(validateSortValue('invalidSort')).toBe(false);
    });
  });
});
