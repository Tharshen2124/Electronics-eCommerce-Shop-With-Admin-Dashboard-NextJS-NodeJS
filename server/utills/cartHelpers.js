// Pure cart utility functions for shopping cart management
// These functions contain no database dependencies and are fully unit-testable.

/**
 * Calculate the total price for all items in a cart.
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number} Total rounded to 2 decimal places
 */
function calculateCartTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    return sum + price * quantity;
  }, 0);

  return Math.round(total * 100) / 100;
}

/**
 * Validate whether a requested quantity is available for a product.
 * @param {{ inStock: number }} product  - Product record with inStock count
 * @param {number} requestedQty          - Quantity the customer wants
 * @returns {{ valid: boolean, message: string }}
 */
function validateCartItem(product, requestedQty) {
  if (!product || typeof product !== 'object') {
    return { valid: false, message: 'Product is required' };
  }

  const qty = parseInt(requestedQty, 10);

  if (isNaN(qty) || qty <= 0) {
    return { valid: false, message: 'Quantity must be a positive number' };
  }

  if (product.inStock === 0) {
    return { valid: false, message: 'Product is out of stock' };
  }

  if (qty > product.inStock) {
    return {
      valid: false,
      message: `Requested quantity (${qty}) exceeds available stock (${product.inStock})`,
    };
  }

  return { valid: true, message: 'Item is available' };
}

/**
 * Check whether the cart has items and can proceed to checkout.
 * @param {Array} cartItems - Array of cart items
 * @returns {{ canProceed: boolean, message: string }}
 */
function canProceedToCheckout(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { canProceed: false, message: 'Cart is empty' };
  }

  // Verify every item has a positive quantity
  const allValid = cartItems.every(
    (item) => parseInt(item.quantity, 10) > 0
  );

  if (!allValid) {
    return { canProceed: false, message: 'All items must have a valid quantity' };
  }

  return { canProceed: true, message: 'Ready to checkout' };
}

module.exports = {
  calculateCartTotal,
  validateCartItem,
  canProceedToCheckout,
};
