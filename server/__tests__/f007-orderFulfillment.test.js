/**
 * F007 — Admin Order Fulfillment
 *
 * Unit tests covering order update validation (DT) and order status
 * transition logic (STT).
 *
 * Source files under test:
 *   - utills/validation.js          → orderValidation.validateStatus, validateOrderData
 *   - controllers/customer_orders.js → updateCustomerOrder handler
 *
 * NOTE: The system does NOT enforce order status transitions. The
 * updateCustomerOrder handler accepts any valid status string regardless of
 * the current status. STT tests are written to expected spec behavior and
 * will FAIL, documenting that transition validation is not implemented.
 */

// ---------------------------------------------------------------------------
// Mock Prisma — customer_orders.js uses new PrismaClient() directly
// ---------------------------------------------------------------------------
const mockPrisma = {
  customer_order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Must mock notificationHelpers since customer_orders.js imports it
jest.mock('../utills/notificationHelpers', () => ({
  createOrderUpdateNotification: jest.fn().mockResolvedValue({}),
}));

const { updateCustomerOrder } = require('../controllers/customer_orders');
const { orderValidation, validateOrderData } = require('../utills/validation');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function validOrderData(overrides = {}) {
  return {
    name: 'Jane',
    lastname: 'Smith',
    email: 'jane.smith@test.com',
    phone: '0123456789',
    company: 'Smith Corp',
    adress: '456 Order Street',
    apartment: '2B',
    city: 'Penang',
    country: 'Malaysia',
    postalCode: '10000',
    total: 149.99,
    status: 'pending',
    ...overrides,
  };
}

const mockReq = (body = {}, params = {}) => ({
  body,
  params,
  method: 'PUT',
  path: '/api/orders',
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
// F007 Tests
// ---------------------------------------------------------------------------
describe('F007 - Admin Order Fulfillment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Decision Table — Order Update Validation
  // =========================================================================
  describe('Decision Table - Order Update Validation', () => {
    // TC-07-DT-001: All contact/shipping fields valid + valid email + valid phone → update order
    test('validates complete order data with all fields valid', () => {
      const orderData = validOrderData();
      const result = validateOrderData(orderData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedData.name).toBe('Jane');
      expect(result.validatedData.email).toBe('jane.smith@test.com');
      expect(result.validatedData.phone).toBeDefined();
      expect(result.validatedData.total).toBe(149.99);
    });

    // TC-07-DT-002: Missing required fields → block update, show missing fields error
    test('blocks update when required fields are missing', () => {
      const orderData = {
        name: '',
        lastname: '',
        email: '',
        phone: '',
        company: '',
        adress: '',
        apartment: '',
        city: '',
        country: '',
        postalCode: '',
        total: null,
      };
      const result = validateOrderData(orderData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const fieldNames = result.errors.map((e) => e.field);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('lastname');
      expect(fieldNames).toContain('email');
      expect(fieldNames).toContain('phone');
    });

    // TC-07-DT-003: Invalid email format → block update, show invalid email error
    test('blocks update with invalid email format', () => {
      const orderData = validOrderData({ email: 'not-an-email' });
      const result = validateOrderData(orderData);

      expect(result.isValid).toBe(false);
      const emailErrors = result.errors.filter((e) => e.field === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    // TC-07-DT-004: Phone number too short → block update, show phone length error
    test('blocks update with phone number too short', () => {
      const orderData = validOrderData({ phone: '12345' });
      const result = validateOrderData(orderData);

      expect(result.isValid).toBe(false);
      const phoneErrors = result.errors.filter((e) => e.field === 'phone');
      expect(phoneErrors.length).toBeGreaterThan(0);
      expect(phoneErrors[0].message).toContain('10 digits');
    });
  });

  // =========================================================================
  // State Transition Testing — Order Status
  // All STT tests EXPECTED TO FAIL: The system does not enforce transitions.
  // updateCustomerOrder accepts any valid status regardless of current status.
  // =========================================================================
  describe('State Transition Testing - Order Status', () => {
    // TC-07-STT-001: Order status: Pending → Processing (valid transition)
    test('allows transition from pending to processing', async () => {
      const existingOrder = { id: 'ord-1', status: 'pending', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'processing',
      });

      const req = mockReq(validOrderData({ status: 'processing' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-002: Order status: Processing → Shipped (valid transition)
    test('allows transition from processing to shipped', async () => {
      const existingOrder = { id: 'ord-1', status: 'processing', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'shipped',
      });

      const req = mockReq(validOrderData({ status: 'shipped' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-003: Order status: Shipped → Delivered (valid transition)
    test('allows transition from shipped to delivered', async () => {
      const existingOrder = { id: 'ord-1', status: 'shipped', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'delivered',
      });

      const req = mockReq(validOrderData({ status: 'delivered' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-004: Order status: Pending → Cancelled (valid transition)
    test('allows transition from pending to cancelled', async () => {
      const existingOrder = { id: 'ord-1', status: 'pending', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });

      const req = mockReq(validOrderData({ status: 'cancelled' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-005: Order status: Processing → Cancelled (valid transition)
    test('allows transition from processing to cancelled', async () => {
      const existingOrder = { id: 'ord-1', status: 'processing', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });

      const req = mockReq(validOrderData({ status: 'cancelled' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-006: Order status: Shipped → Cancelled (valid transition)
    test('allows transition from shipped to cancelled', async () => {
      const existingOrder = { id: 'ord-1', status: 'shipped', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });

      const req = mockReq(validOrderData({ status: 'cancelled' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // TC-07-STT-007: Order status: Delivered → Cancelled (INVALID – system must block)
    // EXPECTED TO FAIL: System does not enforce transition rules
    test('blocks transition from delivered to cancelled', async () => {
      const existingOrder = { id: 'ord-1', status: 'delivered', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      // System will happily update — it doesn't check transitions
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'cancelled',
      });

      const req = mockReq(validOrderData({ status: 'cancelled' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      // Per spec, this transition should be blocked with 400
      expect(res.status).toHaveBeenCalledWith(400);
    });

    // TC-07-STT-008: Order status: Cancelled → Pending (INVALID – system must block)
    // EXPECTED TO FAIL: System does not enforce transition rules
    test('blocks transition from cancelled to pending', async () => {
      const existingOrder = { id: 'ord-1', status: 'cancelled', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'pending',
      });

      const req = mockReq(validOrderData({ status: 'pending' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      // Per spec, this transition should be blocked with 400
      expect(res.status).toHaveBeenCalledWith(400);
    });

    // TC-07-STT-009: Order status: Delivered → Pending (INVALID – system must block)
    // EXPECTED TO FAIL: System does not enforce transition rules
    test('blocks transition from delivered to pending', async () => {
      const existingOrder = { id: 'ord-1', status: 'delivered', email: 'jane@test.com' };
      mockPrisma.customer_order.findUnique.mockResolvedValue(existingOrder);
      mockPrisma.customer_order.update.mockResolvedValue({
        ...existingOrder,
        status: 'pending',
      });

      const req = mockReq(validOrderData({ status: 'pending' }), { id: 'ord-1' });
      const res = mockRes();

      await updateCustomerOrder(req, res);

      // Per spec, this transition should be blocked with 400
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
