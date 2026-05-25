/**
 * F003 — Shopping Cart Management
 *
 * Unit tests covering cart add/remove logic, stock checks (DT), and cart
 * workflow scenarios including checkout validation (UC).
 *
 * Source files under test:
 *   - utills/cartHelpers.js   → calculateCartTotal, validateCartItem, canProceedToCheckout
 *   - utills/validation.js    → orderValidation (validateEmail, validatePhone, validateName),
 *                                validateOrderData
 */

const {
  calculateCartTotal,
  validateCartItem,
  canProceedToCheckout,
} = require('../utills/cartHelpers');

const {
  orderValidation,
  validateOrderData,
} = require('../utills/validation');

// ---------------------------------------------------------------------------
// F003 Tests
// ---------------------------------------------------------------------------
describe('F003 - Shopping Cart Management', () => {
  // =========================================================================
  // Decision Table — Cart Logic and Stock Checks
  // =========================================================================
  describe('Decision Table - Cart Logic and Stock Checks', () => {
    // TC-03-DT-001: Add item to cart → item added, cart badge updated
    test('adds item to cart and calculates updated total', () => {
      const cartBefore = [{ price: 29.99, quantity: 1 }];
      const newItem = { price: 49.99, quantity: 1 };
      const cartAfter = [...cartBefore, newItem];

      const total = calculateCartTotal(cartAfter);

      expect(cartAfter).toHaveLength(2);
      expect(total).toBe(79.98);
    });

    // TC-03-DT-002: Increase item quantity within stock → quantity updated
    test('allows quantity increase when stock is sufficient', () => {
      const product = { inStock: 10 };
      const result = validateCartItem(product, 5);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Item is available');
    });

    // TC-03-DT-003: Increase quantity beyond available stock → block with error
    test('blocks quantity increase beyond available stock', () => {
      const product = { inStock: 3 };
      const result = validateCartItem(product, 5);

      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceeds available stock');
    });

    // TC-03-DT-004: Proceed to checkout with items in cart → redirect to checkout
    test('allows checkout when cart has items', () => {
      const cartItems = [
        { id: 'prod-1', quantity: 1, price: 10 },
        { id: 'prod-2', quantity: 2, price: 20 },
      ];
      const result = canProceedToCheckout(cartItems);

      expect(result.canProceed).toBe(true);
      expect(result.message).toBe('Ready to checkout');
    });

    // TC-03-DT-005: Proceed to checkout with empty cart → block with warning
    test('blocks checkout when cart is empty', () => {
      const result = canProceedToCheckout([]);

      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Cart is empty');
    });
  });

  // =========================================================================
  // Use Case — Cart Workflow Logic
  // =========================================================================
  describe('Use Case - Cart Workflow Logic', () => {
    // TC-03-UC-001: Main Flow – Add to cart and checkout successfully
    test('adds item and proceeds to checkout successfully', () => {
      const cart = [{ price: 59.99, quantity: 1 }];

      const total = calculateCartTotal(cart);
      expect(total).toBe(59.99);

      const checkout = canProceedToCheckout(cart);
      expect(checkout.canProceed).toBe(true);
    });

    // TC-03-UC-002: Alternate Flow 1 – Add to cart, increase quantity, then checkout
    test('increases quantity and recalculates total before checkout', () => {
      // Start with quantity 1
      const cart = [{ price: 25.00, quantity: 1 }];
      expect(calculateCartTotal(cart)).toBe(25.00);

      // Increase quantity to 3
      cart[0].quantity = 3;
      expect(calculateCartTotal(cart)).toBe(75.00);

      // Proceed to checkout
      const checkout = canProceedToCheckout(cart);
      expect(checkout.canProceed).toBe(true);
    });

    // TC-03-UC-003: Alternate Flow 2 – Multiple products with quantity changes, checkout
    test('handles multiple products with different quantities', () => {
      const cart = [
        { price: 10, quantity: 2 },
        { price: 20, quantity: 1 },
        { price: 5.50, quantity: 4 },
      ];

      const total = calculateCartTotal(cart);
      // 10*2 + 20*1 + 5.50*4 = 20 + 20 + 22 = 62
      expect(total).toBe(62.00);

      const checkout = canProceedToCheckout(cart);
      expect(checkout.canProceed).toBe(true);
    });

    // TC-03-UC-004: Alternate Flow 3 – Buy Now (skip cart, direct checkout)
    test('creates single-item cart for buy-now flow', () => {
      const buyNowItem = { price: 199.99, quantity: 1 };
      const buyNowCart = [buyNowItem];

      const total = calculateCartTotal(buyNowCart);
      expect(total).toBe(199.99);

      const checkout = canProceedToCheckout(buyNowCart);
      expect(checkout.canProceed).toBe(true);
    });

    // TC-03-UC-005: Alternate Flow 4 – Add to cart then Buy Now a different product
    test('handles buy-now replacing cart context', () => {
      // Existing cart
      const existingCart = [{ price: 30, quantity: 1 }];
      expect(calculateCartTotal(existingCart)).toBe(30);

      // Buy Now creates a separate single-item context
      const buyNowCart = [{ price: 89.99, quantity: 1 }];
      expect(calculateCartTotal(buyNowCart)).toBe(89.99);

      // Buy Now cart proceeds independently
      const checkout = canProceedToCheckout(buyNowCart);
      expect(checkout.canProceed).toBe(true);
    });

    // TC-03-UC-006: Alternate Flow 5 – Invalid email format at checkout
    test('rejects checkout with invalid email format', () => {
      expect(() => {
        orderValidation.validateEmail('invalid-email');
      }).toThrow();
    });

    // TC-03-UC-007: Alternate Flow 6 – Empty required fields at checkout
    test('rejects checkout with empty required fields', () => {
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
    });

    // TC-03-UC-008: Alternate Flow 7 – Phone number too short (5 digits)
    test('rejects checkout with 5-digit phone number', () => {
      expect(() => {
        orderValidation.validatePhone('12345');
      }).toThrow('Phone number must be at least 10 digits');
    });

    // TC-03-UC-009: Alternate Flow 8 – Name or lastname too short (1 character)
    test('rejects checkout with single-character name', () => {
      expect(() => {
        orderValidation.validateName('A', 'name');
      }).toThrow('name must be at least 2 characters');
    });
  });
});
