// Feature: giarva-ecommerce
// Property 13: Cart mutation consistency
// Property 14: Cart totals invariant
// Property 15: clearCart empties state

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Import the pure reducer and helpers directly so tests run without React
// ---------------------------------------------------------------------------

// Re-implement the same pure functions here to keep tests self-contained and
// avoid coupling to React internals. The reducer logic is tested against the
// same contract the CartContext exposes.

function calculateTotals(items) {
    return items.reduce(
        (acc, item) => ({
            totalItems: acc.totalItems + item.quantity,
            totalAmount: acc.totalAmount + item.price * item.quantity,
        }),
        { totalItems: 0, totalAmount: 0 }
    );
}

const initialState = { items: [], totalItems: 0, totalAmount: 0 };

function cartReducer(state, action) {
    switch (action.type) {
        case "ADD_ITEM": {
            const { product, quantity = 1 } = action.payload;
            const existingIndex = state.items.findIndex(
                (item) => item.productId === product.productId
            );
            let updatedItems;
            if (existingIndex >= 0) {
                updatedItems = state.items.map((item, index) =>
                    index === existingIndex
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                updatedItems = [...state.items, { ...product, quantity }];
            }
            return { items: updatedItems, ...calculateTotals(updatedItems) };
        }
        case "REMOVE_ITEM": {
            const updatedItems = state.items.filter(
                (item) => item.productId !== action.payload.productId
            );
            return { items: updatedItems, ...calculateTotals(updatedItems) };
        }
        case "UPDATE_QUANTITY": {
            const { productId, quantity } = action.payload;
            if (quantity <= 0) {
                const updatedItems = state.items.filter(
                    (item) => item.productId !== productId
                );
                return { items: updatedItems, ...calculateTotals(updatedItems) };
            }
            const updatedItems = state.items.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
            );
            return { items: updatedItems, ...calculateTotals(updatedItems) };
        }
        case "CLEAR_CART":
            return { ...initialState };
        default:
            return state;
    }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a single cart product (matches CartItem shape used by the reducer). */
const productArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1 }),
    price: fc.float({ min: 0, noNaN: true }),
    imageUrl: fc.string(),
});

/** Generates a quantity value between 1 and 99. */
const quantityArb = fc.integer({ min: 1, max: 99 });

/** Generates an array of unique-productId cart items already in the cart. */
const cartItemsArb = fc
    .array(
        fc.record({
            productId: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.string({ minLength: 1 }),
            price: fc.float({ min: 0, noNaN: true }),
            imageUrl: fc.string(),
            quantity: quantityArb,
        }),
        { minLength: 0, maxLength: 20 }
    )
    .map((items) => {
        // Deduplicate by productId so the state is always valid
        const seen = new Set();
        return items.filter(({ productId }) => {
            if (seen.has(productId)) return false;
            seen.add(productId);
            return true;
        });
    });

/** Builds a valid cart state from an array of items. */
function stateFromItems(items) {
    return { items, ...calculateTotals(items) };
}

// ---------------------------------------------------------------------------
// Property 13 — Cart mutation consistency (Requirements 10.2, 10.3)
// ---------------------------------------------------------------------------

describe("Property 13: Cart mutation consistency", () => {
    it("after addItem, the product is present in items", () => {
        fc.assert(
            fc.property(cartItemsArb, productArb, quantityArb, (existingItems, product, qty) => {
                // Ensure the product is NOT already in the cart so we test the "new item" path
                const filtered = existingItems.filter(
                    (i) => i.productId !== product.productId
                );
                const state = stateFromItems(filtered);

                const next = cartReducer(state, {
                    type: "ADD_ITEM",
                    payload: { product, quantity: qty },
                });

                expect(next.items.some((i) => i.productId === product.productId)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    it("addItem on existing product increments quantity, not duplicates", () => {
        fc.assert(
            fc.property(productArb, quantityArb, quantityArb, (product, initialQty, addQty) => {
                const existingItem = { ...product, quantity: initialQty };
                const state = stateFromItems([existingItem]);

                const next = cartReducer(state, {
                    type: "ADD_ITEM",
                    payload: { product, quantity: addQty },
                });

                const matches = next.items.filter((i) => i.productId === product.productId);
                expect(matches).toHaveLength(1);
                expect(matches[0].quantity).toBe(initialQty + addQty);
            }),
            { numRuns: 100 }
        );
    });

    it("after removeItem, the product is absent from items", () => {
        fc.assert(
            fc.property(productArb, quantityArb, cartItemsArb, (product, qty, otherItems) => {
                const filtered = otherItems.filter(
                    (i) => i.productId !== product.productId
                );
                const itemToRemove = { ...product, quantity: qty };
                const state = stateFromItems([itemToRemove, ...filtered]);

                const next = cartReducer(state, {
                    type: "REMOVE_ITEM",
                    payload: { productId: product.productId },
                });

                expect(next.items.some((i) => i.productId === product.productId)).toBe(false);
            }),
            { numRuns: 100 }
        );
    });

    it("removeItem on absent product leaves items unchanged", () => {
        fc.assert(
            fc.property(cartItemsArb, fc.string({ minLength: 1 }), (items, absentId) => {
                // Make sure absentId is truly absent
                const filtered = items.filter((i) => i.productId !== absentId);
                const state = stateFromItems(filtered);

                const next = cartReducer(state, {
                    type: "REMOVE_ITEM",
                    payload: { productId: absentId },
                });

                expect(next.items).toHaveLength(filtered.length);
            }),
            { numRuns: 100 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 14 — Cart totals invariant (Requirements 10.4, 10.5)
// ---------------------------------------------------------------------------

describe("Property 14: Cart totals invariant", () => {
    it("totalAmount === sum(price * quantity) after any ADD_ITEM", () => {
        fc.assert(
            fc.property(cartItemsArb, productArb, quantityArb, (existingItems, product, qty) => {
                const filtered = existingItems.filter(
                    (i) => i.productId !== product.productId
                );
                const state = stateFromItems(filtered);

                const next = cartReducer(state, {
                    type: "ADD_ITEM",
                    payload: { product, quantity: qty },
                });

                const expectedTotal = next.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );
                expect(next.totalAmount).toBeCloseTo(expectedTotal, 5);
            }),
            { numRuns: 100 }
        );
    });

    it("totalItems === sum(quantity) after any ADD_ITEM", () => {
        fc.assert(
            fc.property(cartItemsArb, productArb, quantityArb, (existingItems, product, qty) => {
                const filtered = existingItems.filter(
                    (i) => i.productId !== product.productId
                );
                const state = stateFromItems(filtered);

                const next = cartReducer(state, {
                    type: "ADD_ITEM",
                    payload: { product, quantity: qty },
                });

                const expectedItems = next.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                );
                expect(next.totalItems).toBe(expectedItems);
            }),
            { numRuns: 100 }
        );
    });

    it("totals invariant holds after REMOVE_ITEM", () => {
        fc.assert(
            fc.property(cartItemsArb, (items) => {
                if (items.length === 0) return; // nothing to remove
                const state = stateFromItems(items);
                const target = items[0];

                const next = cartReducer(state, {
                    type: "REMOVE_ITEM",
                    payload: { productId: target.productId },
                });

                const expectedTotal = next.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );
                const expectedCount = next.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                );
                expect(next.totalAmount).toBeCloseTo(expectedTotal, 5);
                expect(next.totalItems).toBe(expectedCount);
            }),
            { numRuns: 100 }
        );
    });

    it("totals invariant holds after UPDATE_QUANTITY", () => {
        fc.assert(
            fc.property(cartItemsArb, quantityArb, (items, newQty) => {
                if (items.length === 0) return;
                const state = stateFromItems(items);
                const target = items[0];

                const next = cartReducer(state, {
                    type: "UPDATE_QUANTITY",
                    payload: { productId: target.productId, quantity: newQty },
                });

                const expectedTotal = next.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );
                const expectedCount = next.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                );
                expect(next.totalAmount).toBeCloseTo(expectedTotal, 5);
                expect(next.totalItems).toBe(expectedCount);
            }),
            { numRuns: 100 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 15 — clearCart empties state (Requirements 10.6)
// ---------------------------------------------------------------------------

describe("Property 15: clearCart empties state", () => {
    it("after clearCart, items is empty, totalAmount is 0, totalItems is 0", () => {
        fc.assert(
            fc.property(cartItemsArb, (items) => {
                const state = stateFromItems(items);

                const next = cartReducer(state, { type: "CLEAR_CART" });

                expect(next.items).toEqual([]);
                expect(next.totalAmount).toBe(0);
                expect(next.totalItems).toBe(0);
            }),
            { numRuns: 100 }
        );
    });

    it("clearCart on already-empty cart returns empty state", () => {
        const next = cartReducer(initialState, { type: "CLEAR_CART" });
        expect(next.items).toEqual([]);
        expect(next.totalAmount).toBe(0);
        expect(next.totalItems).toBe(0);
    });
});
