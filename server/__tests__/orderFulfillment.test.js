/**
 * F007 — Admin Order Fulfillment
 *
 * Unit tests covering order update validation (DT) and order status
 * transition logic (STT).
 *
 * Source files under test:
 *   - utills/validation.js → orderValidation.validateStatus,
 *     orderValidation.validateEmail, orderValidation.validatePhone,
 *     validateOrderData, validateStatusTransition
 */

const {
  orderValidation,
  validateOrderData,
  validateStatusTransition,
} = require('../utills/validation');

// ---------------------------------------------------------------------------
// Helper: build a complete valid order data object for updates
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

// ---------------------------------------------------------------------------
// F007 Tests
// ---------------------------------------------------------------------------
describe('F007 - Admin Order Fulfillment', () => {
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

      // Verify multiple fields reported
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
      expect(emailErrors[0].message).toContain('email');
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
  // =========================================================================
  describe('State Transition Testing - Order Status', () => {
    // TC-07-STT-001: Order status: Pending → Processing (valid transition)
    test('allows transition from pending to processing', () => {
      const result = validateStatusTransition('pending', 'processing');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-002: Order status: Processing → Shipped (valid transition)
    test('allows transition from processing to shipped', () => {
      const result = validateStatusTransition('processing', 'shipped');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-003: Order status: Shipped → Delivered (valid transition)
    test('allows transition from shipped to delivered', () => {
      const result = validateStatusTransition('shipped', 'delivered');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-004: Order status: Pending → Cancelled (valid transition)
    test('allows transition from pending to cancelled', () => {
      const result = validateStatusTransition('pending', 'cancelled');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-005: Order status: Processing → Cancelled (valid transition)
    test('allows transition from processing to cancelled', () => {
      const result = validateStatusTransition('processing', 'cancelled');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-006: Order status: Shipped → Cancelled (valid transition)
    test('allows transition from shipped to cancelled', () => {
      const result = validateStatusTransition('shipped', 'cancelled');
      expect(result.valid).toBe(true);
    });

    // TC-07-STT-007: Order status: Delivered → Cancelled (INVALID – system must block)
    test('blocks transition from delivered to cancelled', () => {
      const result = validateStatusTransition('delivered', 'cancelled');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not allowed');
    });

    // TC-07-STT-008: Order status: Cancelled → Pending (INVALID – system must block)
    test('blocks transition from cancelled to pending', () => {
      const result = validateStatusTransition('cancelled', 'pending');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not allowed');
    });

    // TC-07-STT-009: Order status: Delivered → Pending (INVALID – system must block)
    test('blocks transition from delivered to pending', () => {
      const result = validateStatusTransition('delivered', 'pending');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('not allowed');
    });
  });
});
