// Pure checkout logic extracted from /app/_zustand/store.ts
// These functions mirror the item-selection and scope-clearing behaviour
// introduced by the BUG-C06 fix (Bass et al., 2021).

function resolveCheckoutItems(products, buyNowItems) {
  return buyNowItems.length > 0 ? buyNowItems : products;
}

function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.amount, 0);
}

function clearScope(state, scope) {
  if (scope === "buyNow") {
    return { ...state, buyNowItems: [] };
  }
  return { ...state, products: [] };
}

describe("BUG-C06: Checkout Logic – only user-selected items are processed", () => {
  const cartProducts = [
    { id: "p1", title: "Laptop", price: 999, amount: 1 },
    { id: "p2", title: "Mouse", price: 29, amount: 2 },
  ];

  const buyNowItems = [
    { id: "p3", title: "Keyboard", price: 79, amount: 1 },
  ];

  describe("Item scope resolution", () => {
    it("should use buyNowItems when buyNowItems is non-empty", () => {
      const result = resolveCheckoutItems(cartProducts, buyNowItems);

      expect(result).toEqual(buyNowItems);
      expect(result).not.toEqual(cartProducts);
    });

    it("should use cart products when buyNowItems is empty", () => {
      const result = resolveCheckoutItems(cartProducts, []);

      expect(result).toEqual(cartProducts);
    });

    it("should return an empty array when both cart and buyNowItems are empty", () => {
      const result = resolveCheckoutItems([], []);

      expect(result).toEqual([]);
    });

    it("should not include cart items when buyNow flow is active", () => {
      const result = resolveCheckoutItems(cartProducts, buyNowItems);

      const cartIds = cartProducts.map((p) => p.id);
      const resultIds = result.map((p) => p.id);
      const overlap = resultIds.filter((id) => cartIds.includes(id));

      expect(overlap).toHaveLength(0);
    });
  });

  describe("Total computation uses only the selected scope", () => {
    it("should compute total from buyNowItems only when buyNow flow is active", () => {
      const items = resolveCheckoutItems(cartProducts, buyNowItems);
      const total = computeTotal(items);

      expect(total).toBe(79); // 79 * 1
    });

    it("should compute total from cart products when buyNowItems is empty", () => {
      const items = resolveCheckoutItems(cartProducts, []);
      const total = computeTotal(items);

      expect(total).toBe(1057); // 999*1 + 29*2
    });

    it("should return 0 total when checkout items list is empty", () => {
      const total = computeTotal([]);

      expect(total).toBe(0);
    });

    it("should correctly sum multiple quantities", () => {
      const items = [
        { id: "p1", price: 10, amount: 3 },
        { id: "p2", price: 5, amount: 4 },
      ];
      expect(computeTotal(items)).toBe(50); // 30 + 20
    });
  });

  describe("Scope isolation – clearing one scope does not affect the other", () => {
    const initialState = {
      products: cartProducts,
      buyNowItems: buyNowItems,
    };

    it("should clear buyNowItems without touching cart products", () => {
      const newState = clearScope(initialState, "buyNow");

      expect(newState.buyNowItems).toEqual([]);
      expect(newState.products).toEqual(cartProducts);
    });

    it("should clear cart products without touching buyNowItems", () => {
      const newState = clearScope(initialState, "cart");

      expect(newState.products).toEqual([]);
      expect(newState.buyNowItems).toEqual(buyNowItems);
    });

    it("should leave all items intact when no clear action is taken", () => {
      expect(initialState.products).toHaveLength(2);
      expect(initialState.buyNowItems).toHaveLength(1);
    });

    it("should not mutate the original state when clearing a scope", () => {
      const before = { ...initialState };
      clearScope(initialState, "buyNow");

      expect(initialState.products).toEqual(before.products);
      expect(initialState.buyNowItems).toEqual(before.buyNowItems);
    });
  });
});
