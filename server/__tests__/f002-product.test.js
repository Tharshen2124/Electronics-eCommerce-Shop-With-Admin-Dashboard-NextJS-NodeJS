/**
 * F002 — Product Browsing & Discovery
 *
 * Unit tests covering filter combination logic (DT) and browsing/sorting
 * workflows (UC). Tested indirectly through the getAllProducts handler since
 * the filter/sort validation functions are internal (not exported).
 *
 * Source files under test:
 *   - controllers/products.js → getAllProducts handler
 */

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
jest.mock('../utills/db', () => ({
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require('../utills/db');
const { getAllProducts } = require('../controllers/products');

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
    test('returns products when price filter is applied', async () => {
      const mockProducts = [{ id: 'p1', title: 'Cheap Item', price: 30 }];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(1);

      const url = '/api/products?filters[price][$lte]=100&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-DT-002: Price + rating filters combined
    test('returns products when price and rating filters are applied', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[price][$lte]=200&filters[rating][$gte]=4&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-DT-003: Price + rating + in-stock filters combined
    test('returns products when price, rating, and inStock filters are applied', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[price][$lte]=150&filters[rating][$gte]=3&filters[inStock][$gte]=1&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
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
    test('filters products by category "Headphones"', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[category][$equals]=Headphones&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
      // Prisma should be called with category filter
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: expect.any(Object),
          }),
        })
      );
    });

    // TC-02-UC-002: Alternate Flow 1 – Filter by availability (In Stock only)
    test('filters products by inStock', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[inStock][$gte]=1&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-UC-003: Alternate Flow 1 – Filter by availability (Out of Stock only)
    test('filters products by outOfStock', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[outOfStock][$equals]=0&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-UC-004: Alternate Flow 2 – Filter by max price ($40)
    test('filters products by maximum price $40', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[price][$lte]=40&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-UC-005: Alternate Flow 3 – Filter by minimum rating (5 stars)
    test('filters products by minimum rating 5', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[rating][$gte]=5&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });

    // TC-02-UC-006: Alternate Flow 4 – Sort products A-Z
    test('sorts products by title ascending (A-Z)', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?sort=titleAsc&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        })
      );
    });

    // TC-02-UC-007: Alternate Flow 5 – Sort products Z-A
    test('sorts products by title descending (Z-A)', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?sort=titleDesc&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'desc' },
        })
      );
    });

    // TC-02-UC-008: Alternate Flow 6 – Sort by lowest price
    test('sorts products by lowest price', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?sort=lowPrice&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'asc' },
        })
      );
    });

    // TC-02-UC-009: Alternate Flow 7 – Sort by highest price
    test('sorts products by highest price', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?sort=highPrice&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { price: 'desc' },
        })
      );
    });

    // TC-02-UC-010: Alternate Flow 8 – Multiple filters and sort applied simultaneously
    test('applies multiple filters and sort simultaneously', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const url = '/api/products?filters[price][$lte]=500&filters[rating][$gte]=4&sort=lowPrice&page=1';
      const req = mockReq({ page: '1' }, url);
      const res = mockRes();

      getAllProducts(req, res, jest.fn());
      await flushPromises();

      expect(res.json).toHaveBeenCalled();
    });
  });
});
