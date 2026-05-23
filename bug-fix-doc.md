# Bug Fix Documentation

---

## BUG-CO6: Incorrect Checkout Scope Handling in Cart Module

| Field | Detail |
|---|---|
| **Bug ID** | BUG-CO6 |
| **Severity** | High |
| **Module** | Shopping Cart / Checkout |
| **Status** | Fixed |

### Context

The application supports two purchase paths: **Add to Cart → Checkout**, which processes all cart items, and **Buy Now**, which is intended to immediately purchase only the single product the user selected. The bug caused "Buy Now" to process all items in the cart instead of just the targeted product, and on order completion it wiped the user's entire cart.

### Root Cause

`BuyNowSingleProductBtn` called `addToCart()` — the same action used by the regular "Add to Cart" button — which merged the selected product into the shared `products` array in the Zustand store. The checkout page then unconditionally read the full `products` array with no mechanism to distinguish a "Buy Now" session from a regular cart checkout, submitting all items and calling `clearCart()` regardless of intent.

```tsx
// BuyNowSingleProductBtn.tsx — before fix
const { addToCart, calculateTotals } = useProductStore();

const handleAddToCart = () => {
  addToCart({ id: product?.id.toString(), ... }); // pollutes the shared cart
  calculateTotals();
  router.push("/checkout");
};
```

```tsx
// checkout/page.tsx — before fix
const { products, total, clearCart } = useProductStore();

// submitted all cart items regardless of how they got there
for (let i = 0; i < products.length; i++) {
  await addOrderProduct(orderId, products[i].id, products[i].amount);
}
clearCart(); // wiped the entire cart after every checkout
```

### Solution

A separate `buyNowItems` field was added to the Zustand store, isolated from the regular cart. The "Buy Now" button populates this field instead of `addToCart`. The checkout page then derives its working scope from `buyNowItems` when present, falling back to the full cart otherwise, and cleans up only the scope that was used.

**`app/_zustand/store.ts`** — Added `buyNowItems: ProductInCart[]` to state with `setBuyNowItems` and `clearBuyNowItems` actions. These actions only ever touch `buyNowItems`, making it structurally impossible for a "Buy Now" operation to affect the user's cart.

```ts
setBuyNowItems: (items) => set(() => ({ buyNowItems: items })),
clearBuyNowItems: () => set(() => ({ buyNowItems: [] })),
```

**`components/BuyNowSingleProductBtn.tsx`** — Replaced `addToCart` + `calculateTotals` with `setBuyNowItems`. The cart is never touched.

```tsx
const { setBuyNowItems } = useProductStore();

const handleBuyNow = () => {
  setBuyNowItems([{ id: product?.id.toString(), title: product?.title, price: product?.price, image: product?.mainImage, amount: quantityCount }]);
  router.push("/checkout");
};
```

**`app/checkout/page.tsx`** — The page now derives `checkoutItems` and `checkoutTotal` from the correct scope at the top of the component. All order display, validation, submission, and cleanup logic operates on these derived values rather than the raw store state.

```tsx
const { products, total, clearCart, buyNowItems, clearBuyNowItems } = useProductStore();

const checkoutItems = buyNowItems.length > 0 ? buyNowItems : products;
const checkoutTotal = checkoutItems.reduce((sum, p) => sum + p.price * p.amount, 0);
```

`checkoutTotal` is computed inline rather than reading `total` from the store because `calculateTotals()` is never called in the "Buy Now" flow, meaning the store's `total` would not reflect the selected item's price.

Post-order cleanup was also corrected to only clear what was used — `clearBuyNowItems()` in the Buy Now path (preserving the user's cart) or `clearCart()` for a normal cart checkout.

```tsx
if (buyNowItems.length > 0) {
  clearBuyNowItems();
} else {
  clearCart();
}
```

---
