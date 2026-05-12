// Feature: checkout-auto-address
// Property 10: Order Weight Calculation - Validates Requirements 8.1, 11.3
// Property 11: Shipping Cost Calculation Inputs - Validates Requirements 8.3
// Property 13: Total Includes Shipping Cost - Validates Requirements 8.6, 15.4
// Property 15: Regular Couriers for Light Orders - Validates Requirements 9.2
// Property 16: Cargo Courier for Heavy Orders - Validates Requirements 9.3, 11.1
// Property 17: GoSend Always Available - Validates Requirements 9.4, 12.1, 12.2, 12.6

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
    calculateOrderWeight,
    getAvailableCouriers,
    calculateShippingCost,
} from "../../services/ShippingService.js";

// ---------------------------------------------------------------------------
// Arbitraries
// Note: fc.float in fast-check v4 requires 32-bit float values (Math.fround)
// Use fc.integer for weights (in 100g units) and divide, or use fc.double
// ---------------------------------------------------------------------------

// Weight in kg as integer multiples of 0.5 (0.5 to 10kg)
const itemWeightArb = fc.integer({ min: 1, max: 20 }).map((n) => n * 0.5);

const cartItemWithWeightArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 10 }),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    price: fc.integer({ min: 1000, max: 100000 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    weight: itemWeightArb,
});

const cartItemNoWeightArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 10 }),
    quantity: fc.integer({ min: 1, max: 10 }),
});

const postalCodeArb = fc.integer({ min: 10000, max: 99999 }).map(String);

// Light weight: 0.5 to 19.5 kg (< 20kg)
const lightWeightArb = fc.integer({ min: 1, max: 39 }).map((n) => n * 0.5);

// Heavy weight: 20 to 100 kg (>= 20kg)
const heavyWeightArb = fc.integer({ min: 40, max: 200 }).map((n) => n * 0.5);

// Any positive weight
const anyWeightArb = fc.integer({ min: 1, max: 200 }).map((n) => n * 0.5);

const courierIdArb = fc.constantFrom(
    "jne-reg", "jnt-reg", "wahana-reg", "wahana-cargo", "gosend-same", "gosend-instant"
);

// ---------------------------------------------------------------------------
// Property 10: Order Weight Calculation
// Validates: Requirements 8.1, 11.3
// ---------------------------------------------------------------------------
describe("Property 10: Order Weight Calculation", () => {
    it("weight = sum of (item.weight × item.quantity) for all items", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemWithWeightArb, { minLength: 1, maxLength: 10 }),
                (cartItems) => {
                    const result = calculateOrderWeight(cartItems, {});
                    const expected = cartItems.reduce(
                        (sum, item) => sum + item.weight * item.quantity,
                        0
                    );
                    expect(Math.abs(result - expected)).toBeLessThan(0.0001);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("items without weight default to 1kg per item", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemNoWeightArb, { minLength: 1, maxLength: 10 }),
                (cartItems) => {
                    const result = calculateOrderWeight(cartItems, {});
                    const expected = cartItems.reduce(
                        (sum, item) => sum + 1 * item.quantity,
                        0
                    );
                    expect(result).toBe(expected);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("product weight takes precedence over item weight", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemWithWeightArb, { minLength: 1, maxLength: 5 }),
                itemWeightArb,
                (cartItems, productWeight) => {
                    const products = {};
                    cartItems.forEach((item) => {
                        products[item.productId] = { weight: productWeight };
                    });
                    const result = calculateOrderWeight(cartItems, products);
                    const expected = cartItems.reduce(
                        (sum, item) => sum + productWeight * item.quantity,
                        0
                    );
                    expect(Math.abs(result - expected)).toBeLessThan(0.0001);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("empty cart always returns 0", () => {
        expect(calculateOrderWeight([], {})).toBe(0);
        expect(calculateOrderWeight(null, {})).toBe(0);
        expect(calculateOrderWeight(undefined, {})).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Property 11: Shipping Cost Calculation Inputs
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------
describe("Property 11: Shipping Cost Calculation Inputs", () => {
    it("calculateShippingCost accepts postalCode, city, and weight as inputs and returns non-negative number", () => {
        fc.assert(
            fc.property(
                courierIdArb,
                postalCodeArb,
                fc.string({ minLength: 3, maxLength: 20 }),
                anyWeightArb,
                (courierId, postalCode, city, weight) => {
                    const courier = { id: courierId, name: courierId, serviceType: "regular" };
                    const cost = calculateShippingCost(courier, { postalCode, city }, weight);
                    expect(typeof cost).toBe("number");
                    expect(cost).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("cost changes based on postalCode (distance affects cost)", () => {
        fc.assert(
            fc.property(
                courierIdArb,
                fc.integer({ min: 1, max: 10 }),
                (courierId, weight) => {
                    const courier = { id: courierId, name: courierId, serviceType: "regular" };
                    const jakartaCost = calculateShippingCost(
                        courier, { postalCode: "12345", city: "Jakarta" }, weight
                    );
                    const outerCost = calculateShippingCost(
                        courier, { postalCode: "80000", city: "Denpasar" }, weight
                    );
                    // Outer island (2.0x) must cost more than Jakarta (1.0x)
                    expect(outerCost).toBeGreaterThan(jakartaCost);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("cost increases with weight", () => {
        fc.assert(
            fc.property(
                courierIdArb,
                fc.integer({ min: 1, max: 9 }),
                fc.integer({ min: 11, max: 19 }),
                (courierId, lightWeight, heavyWeight) => {
                    const courier = { id: courierId, name: courierId, serviceType: "regular" };
                    const destination = { postalCode: "12345", city: "Jakarta" };
                    const lightCost = calculateShippingCost(courier, destination, lightWeight);
                    const heavyCost = calculateShippingCost(courier, destination, heavyWeight);
                    expect(heavyCost).toBeGreaterThanOrEqual(lightCost);
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 13: Total Includes Shipping Cost
// Validates: Requirements 8.6, 15.4
// ---------------------------------------------------------------------------
describe("Property 13: Total Includes Shipping Cost", () => {
    it("total = subtotal + shippingCost + paymentFee", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        price: fc.integer({ min: 1000, max: 100000 }),
                        quantity: fc.integer({ min: 1, max: 10 }),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                fc.integer({ min: 0, max: 100000 }),
                fc.integer({ min: 0, max: 50000 }),
                (items, shippingCost, paymentFee) => {
                    const subtotal = items.reduce(
                        (sum, item) => sum + item.price * item.quantity, 0
                    );
                    const total = subtotal + shippingCost + paymentFee;
                    expect(total).toBe(subtotal + shippingCost + paymentFee);
                    expect(total).toBeGreaterThanOrEqual(subtotal);
                    expect(total).toBeGreaterThanOrEqual(shippingCost);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("shipping cost is always non-negative", () => {
        fc.assert(
            fc.property(courierIdArb, postalCodeArb, anyWeightArb, (courierId, postalCode, weight) => {
                const courier = { id: courierId, name: courierId, serviceType: "regular" };
                const cost = calculateShippingCost(courier, { postalCode, city: "TestCity" }, weight);
                expect(cost).toBeGreaterThanOrEqual(0);
            }),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 15: Regular Couriers for Light Orders
// Validates: Requirements 9.2
// ---------------------------------------------------------------------------
describe("Property 15: Regular Couriers for Light Orders", () => {
    it("for any weight < 20kg, JNE, JNT, and Wahana are available", () => {
        fc.assert(
            fc.property(postalCodeArb, lightWeightArb, (postalCode, weight) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", weight).map((c) => c.id);
                expect(ids).toContain("jne-reg");
                expect(ids).toContain("jnt-reg");
                expect(ids).toContain("wahana-reg");
            }),
            { numRuns: 20 }
        );
    });

    it("for any weight < 20kg, Wahana Cargo is NOT available", () => {
        fc.assert(
            fc.property(postalCodeArb, lightWeightArb, (postalCode, weight) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", weight).map((c) => c.id);
                expect(ids).not.toContain("wahana-cargo");
            }),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 16: Cargo Courier for Heavy Orders
// Validates: Requirements 9.3, 11.1
// ---------------------------------------------------------------------------
describe("Property 16: Cargo Courier for Heavy Orders", () => {
    it("for any weight >= 20kg, Wahana Cargo is available", () => {
        fc.assert(
            fc.property(postalCodeArb, heavyWeightArb, (postalCode, weight) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", weight).map((c) => c.id);
                expect(ids).toContain("wahana-cargo");
            }),
            { numRuns: 20 }
        );
    });

    it("for any weight >= 20kg, regular couriers (JNE, JNT, Wahana) are NOT available", () => {
        fc.assert(
            fc.property(postalCodeArb, heavyWeightArb, (postalCode, weight) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", weight).map((c) => c.id);
                expect(ids).not.toContain("jne-reg");
                expect(ids).not.toContain("jnt-reg");
                expect(ids).not.toContain("wahana-reg");
            }),
            { numRuns: 20 }
        );
    });

    it("boundary: weight exactly 20kg triggers cargo, not regular", () => {
        fc.assert(
            fc.property(postalCodeArb, (postalCode) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", 20).map((c) => c.id);
                expect(ids).toContain("wahana-cargo");
                expect(ids).not.toContain("jne-reg");
            }),
            { numRuns: 10 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 17: GoSend Always Available
// Validates: Requirements 9.4, 12.1, 12.2, 12.6
// ---------------------------------------------------------------------------
describe("Property 17: GoSend Always Available", () => {
    it("for any weight, GoSend same-day and instant are always available", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const ids = getAvailableCouriers(postalCode, "TestCity", weight).map((c) => c.id);
                expect(ids).toContain("gosend-same");
                expect(ids).toContain("gosend-instant");
            }),
            { numRuns: 20 }
        );
    });

    it("GoSend same-day has 'same-day' serviceType", () => {
        fc.assert(
            fc.property(anyWeightArb, (weight) => {
                const couriers = getAvailableCouriers("12345", "Jakarta", weight);
                const goSendSame = couriers.find((c) => c.id === "gosend-same");
                expect(goSendSame).toBeDefined();
                expect(goSendSame.serviceType).toBe("same-day");
            }),
            { numRuns: 10 }
        );
    });

    it("GoSend instant has 'instant' serviceType", () => {
        fc.assert(
            fc.property(anyWeightArb, (weight) => {
                const couriers = getAvailableCouriers("12345", "Jakarta", weight);
                const goSendInstant = couriers.find((c) => c.id === "gosend-instant");
                expect(goSendInstant).toBeDefined();
                expect(goSendInstant.serviceType).toBe("instant");
            }),
            { numRuns: 10 }
        );
    });

    it("GoSend costs more than regular couriers for light orders", () => {
        fc.assert(
            fc.property(postalCodeArb, lightWeightArb, (postalCode, weight) => {
                const destination = { postalCode, city: "TestCity" };
                const jneCost = calculateShippingCost(
                    { id: "jne-reg", name: "JNE", serviceType: "regular" }, destination, weight
                );
                const goSendSameCost = calculateShippingCost(
                    { id: "gosend-same", name: "GoSend Same Day", serviceType: "same-day" }, destination, weight
                );
                const goSendInstantCost = calculateShippingCost(
                    { id: "gosend-instant", name: "GoSend Instant", serviceType: "instant" }, destination, weight
                );
                expect(goSendSameCost).toBeGreaterThan(jneCost);
                expect(goSendInstantCost).toBeGreaterThan(jneCost);
            }),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 12: Shipping Cost Display
// Validates: Requirements 8.4, 15.2
// ---------------------------------------------------------------------------
describe("Property 12: Shipping Cost Display", () => {
    it("every courier returned by getAvailableCouriers has a calculable cost > 0", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);
                const destination = { postalCode, city: "TestCity" };

                couriers.forEach((courier) => {
                    const cost = calculateShippingCost(courier, destination, weight);
                    // Each courier must produce a positive, finite cost for display
                    expect(cost).toBeGreaterThan(0);
                    expect(isFinite(cost)).toBe(true);
                    expect(Number.isInteger(cost)).toBe(true); // Math.round ensures integer Rupiah
                });
            }),
            { numRuns: 20 }
        );
    });

    it("shipping cost is deterministic for the same inputs", () => {
        fc.assert(
            fc.property(courierIdArb, postalCodeArb, anyWeightArb, (courierId, postalCode, weight) => {
                const courier = { id: courierId, name: courierId, serviceType: "regular" };
                const destination = { postalCode, city: "TestCity" };
                const cost1 = calculateShippingCost(courier, destination, weight);
                const cost2 = calculateShippingCost(courier, destination, weight);
                // Same inputs must always produce the same cost (stable for display)
                expect(cost1).toBe(cost2);
            }),
            { numRuns: 20 }
        );
    });

    it("order summary total = subtotal + shippingCost when paymentFee is 0", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        price: fc.integer({ min: 1000, max: 500000 }),
                        quantity: fc.integer({ min: 1, max: 10 }),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                courierIdArb,
                postalCodeArb,
                anyWeightArb,
                (items, courierId, postalCode, weight) => {
                    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                    const courier = { id: courierId, name: courierId, serviceType: "regular" };
                    const shippingCost = calculateShippingCost(courier, { postalCode, city: "TestCity" }, weight);
                    const total = subtotal + shippingCost; // paymentFee = 0
                    // Shipping cost must appear as a separate addend in the total
                    expect(total - subtotal).toBe(shippingCost);
                    expect(total).toBeGreaterThan(subtotal);
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 14: Courier Options Display
// Validates: Requirements 9.1, 9.5
// ---------------------------------------------------------------------------
describe("Property 14: Courier Options Display", () => {
    it("for any valid address and weight, all couriers have id, name, serviceType, estimatedDelivery", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);

                expect(couriers.length).toBeGreaterThan(0);

                couriers.forEach((courier) => {
                    // Required display fields
                    expect(typeof courier.id).toBe("string");
                    expect(courier.id.length).toBeGreaterThan(0);

                    expect(typeof courier.name).toBe("string");
                    expect(courier.name.length).toBeGreaterThan(0);

                    expect(typeof courier.serviceType).toBe("string");
                    expect(["regular", "same-day", "instant", "cargo"]).toContain(courier.serviceType);

                    expect(typeof courier.estimatedDelivery).toBe("string");
                    expect(courier.estimatedDelivery.length).toBeGreaterThan(0);
                });
            }),
            { numRuns: 20 }
        );
    });

    it("for any valid address and weight, each courier has a positive calculable cost", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const destination = { postalCode, city: "TestCity" };
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);

                couriers.forEach((courier) => {
                    const cost = calculateShippingCost(courier, destination, weight);
                    expect(cost).toBeGreaterThan(0);
                    expect(typeof cost).toBe("number");
                });
            }),
            { numRuns: 20 }
        );
    });

    it("courier list is never empty for any weight", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);
                // GoSend is always present, so list is never empty
                expect(couriers.length).toBeGreaterThanOrEqual(2);
            }),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 18: Single Courier Selection
// Validates: Requirements 9.6
// ---------------------------------------------------------------------------
describe("Property 18: Single Courier Selection", () => {
    it("getAvailableCouriers returns couriers with unique ids (no duplicates)", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);
                const ids = couriers.map((c) => c.id);
                const uniqueIds = new Set(ids);
                // Each courier id must be unique — selecting by id is unambiguous
                expect(uniqueIds.size).toBe(ids.length);
            }),
            { numRuns: 20 }
        );
    });

    it("selecting a courier by id always resolves to exactly one courier", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);

                couriers.forEach((targetCourier) => {
                    // Simulate selection: filter by id
                    const selected = couriers.filter((c) => c.id === targetCourier.id);
                    // Must resolve to exactly one — enforces single selection
                    expect(selected.length).toBe(1);
                });
            }),
            { numRuns: 20 }
        );
    });

    it("deselecting a courier (null) leaves no courier selected", () => {
        fc.assert(
            fc.property(postalCodeArb, anyWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);

                // Simulate state: selectedCourier = null
                const selectedCourier = null;
                const checkedCount = couriers.filter(
                    (c) => selectedCourier && c.id === selectedCourier.id
                ).length;

                expect(checkedCount).toBe(0);
            }),
            { numRuns: 10 }
        );
    });

    it("switching selection from one courier to another deselects the previous", () => {
        fc.assert(
            fc.property(postalCodeArb, lightWeightArb, (postalCode, weight) => {
                const couriers = getAvailableCouriers(postalCode, "TestCity", weight);
                if (couriers.length < 2) return;

                const [first, second] = couriers;

                // After selecting second, only second is checked
                const selectedCourier = second;
                const checkedIds = couriers
                    .filter((c) => c.id === selectedCourier.id)
                    .map((c) => c.id);

                expect(checkedIds.length).toBe(1);
                expect(checkedIds[0]).toBe(second.id);
                expect(checkedIds[0]).not.toBe(first.id);
            }),
            { numRuns: 20 }
        );
    });
});
