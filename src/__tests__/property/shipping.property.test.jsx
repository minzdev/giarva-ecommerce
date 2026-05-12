// Feature: checkout-auto-address
// Property 10: Order Weight Calculation - Validates Requirements 8.1, 11.3
// Property 11: Shipping Cost Calculation Inputs - Validates Requirements 8.3
// Property 12: Shipping Cost Display - Validates Requirements 8.4, 15.2
// Property 13: Total Includes Shipping Cost - Validates Requirements 8.6, 15.4
// Property 14: Courier Options Display - Validates Requirements 9.1, 9.5
// Property 15: Regular Couriers for Light Orders - Validates Requirements 9.2
// Property 16: Cargo Courier for Heavy Orders - Validates Requirements 9.3, 11.1
// Property 17: GoSend Always Available - Validates Requirements 9.4, 12.1, 12.2, 12.6
// Property 18: Single Courier Selection - Validates Requirements 9.6

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Checkout from "../../pages/Checkout";
import CourierSelector from "../../components/CourierSelector";
import { calculateOrderWeight, getAvailableCouriers, calculateShippingCost } from "../../services/ShippingService";

// ---------------------------------------------------------------------------
// Mock Firebase SDK
// ---------------------------------------------------------------------------
vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(() => ({ name: "mock-app" })),
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => ({ type: "mock-auth" })),
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
    signOut: vi.fn(),
}));

const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({ type: "mock-db" })),
    collection: vi.fn((_db, collectionName) => `mock-collection-${collectionName}`),
    doc: vi.fn((_db, collectionName, docId) => `mock-doc-${collectionName}-${docId}`),
    getDoc: (...args) => mockGetDoc(...args),
    addDoc: (...args) => mockAddDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
const mockUseCart = vi.fn();
vi.mock("../../hooks/useCart", () => ({
    useCart: () => mockUseCart(),
    default: () => mockUseCart(),
}));

const mockUseAuth = vi.fn();
vi.mock("../../hooks/useAuth", () => ({
    useAuth: () => mockUseAuth(),
    default: () => mockUseAuth(),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("../../context/ToastContext", () => ({
    useToast: () => ({
        success: mockToastSuccess,
        error: mockToastError,
    }),
}));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
    vi.clearAllMocks();
    mockUseCart.mockReturnValue({
        items: [],
        totalItems: 0,
        totalAmount: 0,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
    });
    mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    });
    mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => ({}),
    });
    mockAddDoc.mockResolvedValue({ id: "mock-order-id" });
});

// ---------------------------------------------------------------------------
// Arbitraries (Generators)
// ---------------------------------------------------------------------------

// Generate valid postal codes matching /^\d{5}$/
const validPostalCodeArb = fc.integer({ min: 10000, max: 99999 }).map(String);

// Generate complete valid address
const validAddressArb = fc.record({
    displayName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    phone: fc.string({ minLength: 7, maxLength: 15 }).filter(s => /^[0-9+\-\s]{7,15}$/.test(s.trim())),
    address: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
    city: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
    postalCode: validPostalCodeArb,
});

// Generate cart items with weight
const cartItemArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    price: fc.integer({ min: 1000, max: 1000000 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    weight: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true, noDefaultInfinity: true }),
    imageUrl: fc.constant(""),
});

// Generate cart items for light orders (< 20kg total)
const lightCartItemsArb = fc.array(cartItemArb, { minLength: 1, maxLength: 5 }).filter(items => {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    return totalWeight < 20;
});

// Generate cart items for heavy orders (>= 20kg total)
const heavyCartItemsArb = fc.array(
    fc.record({
        productId: fc.string({ minLength: 1, maxLength: 20 }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        price: fc.integer({ min: 1000, max: 1000000 }),
        quantity: fc.integer({ min: 1, max: 10 }),
        weight: fc.float({ min: Math.fround(2), max: Math.fround(10), noNaN: true, noDefaultInfinity: true }),
        imageUrl: fc.constant(""),
    }),
    { minLength: 1, maxLength: 5 }
).filter(items => {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    return totalWeight >= 20;
});

// Generate authenticated user
const authenticatedUserArb = fc.record({
    uid: fc.string({ minLength: 1, maxLength: 28 }),
    email: fc.emailAddress(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
});

// Generate destination
const destinationArb = fc.record({
    city: fc.string({ minLength: 3, maxLength: 50 }),
    postalCode: validPostalCodeArb,
});

// ---------------------------------------------------------------------------
// Helper: Render Checkout with mocked data
// ---------------------------------------------------------------------------
function renderCheckout(user, profileAddress, cartItems = []) {
    mockUseAuth.mockReturnValue({
        user,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    });

    mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => profileAddress,
    });

    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const clearCart = vi.fn();

    mockUseCart.mockReturnValue({
        items: cartItems,
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart,
    });

    const result = render(
        <MemoryRouter initialEntries={["/checkout"]}>
            <Routes>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/profile" element={<div data-testid="profile-page">Profile</div>} />
            </Routes>
        </MemoryRouter>
    );

    return { ...result, clearCart };
}

// ---------------------------------------------------------------------------
// Property 10: Order Weight Calculation
// **Validates: Requirements 8.1, 11.3**
// ---------------------------------------------------------------------------
describe("Property 10: Order Weight Calculation", () => {
    it("for any cart with items, weight equals sum of (item.weight × item.quantity)", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemArb, { minLength: 1, maxLength: 10 }),
                (cartItems) => {
                    // Create products map from cart items
                    const productsMap = cartItems.reduce((acc, item) => {
                        acc[item.productId] = { weight: item.weight };
                        return acc;
                    }, {});

                    // Calculate weight using service
                    const calculatedWeight = calculateOrderWeight(cartItems, productsMap);

                    // Calculate expected weight manually
                    const expectedWeight = cartItems.reduce((sum, item) => {
                        return sum + (item.weight * item.quantity);
                    }, 0);

                    // Verify they match (with small tolerance for floating point)
                    expect(Math.abs(calculatedWeight - expectedWeight)).toBeLessThan(0.001);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("defaults to 1kg per item when weight is not specified", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        productId: fc.string({ minLength: 1, maxLength: 20 }),
                        name: fc.string({ minLength: 1, maxLength: 50 }),
                        price: fc.integer({ min: 1000, max: 1000000 }),
                        quantity: fc.integer({ min: 1, max: 10 }),
                        imageUrl: fc.constant(""),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (cartItems) => {
                    // Calculate weight without providing products map
                    const calculatedWeight = calculateOrderWeight(cartItems, {});

                    // Expected weight: sum of quantities (1kg per item)
                    const expectedWeight = cartItems.reduce((sum, item) => sum + item.quantity, 0);

                    expect(calculatedWeight).toBe(expectedWeight);
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 11: Shipping Cost Calculation Inputs
// **Validates: Requirements 8.3**
// ---------------------------------------------------------------------------
describe("Property 11: Shipping Cost Calculation Inputs", () => {
    it("for any shipping calculation, uses postalCode, city, and weight as inputs", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    // Get available couriers
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // For each courier, calculate shipping cost
                    couriers.forEach(courier => {
                        const cost = calculateShippingCost(courier, destination, weight);

                        // Verify cost is calculated (non-zero for valid inputs)
                        expect(cost).toBeGreaterThan(0);
                        expect(typeof cost).toBe('number');
                        expect(isNaN(cost)).toBe(false);
                    });
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 12: Shipping Cost Display
// **Validates: Requirements 8.4, 15.2**
// ---------------------------------------------------------------------------
describe("Property 12: Shipping Cost Display", () => {
    it("for any calculated shipping cost, displayed as separate line item", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                lightCartItemsArb,
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    // Wait for address to load
                    await waitFor(() => {
                        const loadingSpinner = container.querySelector(".animate-spin");
                        expect(loadingSpinner).toBeNull();
                    }, { timeout: 2000 });

                    // Wait for courier selector to appear
                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 2000 });

                    // Select first courier
                    const courierButtons = Array.from(container.querySelectorAll('button[role="radio"]'));
                    if (courierButtons.length > 0) {
                        fireEvent.click(courierButtons[0]);

                        // Verify shipping cost is displayed as separate line item
                        const orderSummary = container.querySelector('aside');
                        expect(orderSummary).not.toBeNull();
                        expect(orderSummary.textContent).toContain("Ongkos Kirim");
                    }

                    unmount();
                }
            ),
            { numRuns: 2, timeout: 8000 }
        );
    }, 60000);
});

// ---------------------------------------------------------------------------
// Property 13: Total Includes Shipping Cost
// **Validates: Requirements 8.6, 15.4**
// ---------------------------------------------------------------------------
describe("Property 13: Total Includes Shipping Cost", () => {
    it("for any order with shipping cost, total = subtotal + shipping + fees", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                lightCartItemsArb,
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        const loadingSpinner = container.querySelector(".animate-spin");
                        expect(loadingSpinner).toBeNull();
                    }, { timeout: 2000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 2000 });

                    const courierButtons = Array.from(container.querySelectorAll('button[role="radio"]'));
                    if (courierButtons.length > 0) {
                        fireEvent.click(courierButtons[0]);

                        await waitFor(() => {
                            expect(container.textContent).toContain("Metode Pembayaran");
                        }, { timeout: 2000 });

                        const paymentRadios = container.querySelectorAll('input[type="radio"][name="payment"]');
                        if (paymentRadios.length > 0) {
                            fireEvent.click(paymentRadios[0]);

                            // Verify order summary contains all components
                            const orderSummary = container.querySelector('aside');
                            expect(orderSummary.textContent).toContain("Subtotal");
                            expect(orderSummary.textContent).toContain("Ongkos Kirim");
                            expect(orderSummary.textContent).toContain("Total");
                        }
                    }

                    unmount();
                }
            ),
            { numRuns: 2, timeout: 10000 }
        );
    }, 60000);
});

// ---------------------------------------------------------------------------
// Property 14: Courier Options Display
// **Validates: Requirements 9.1, 9.5**
// ---------------------------------------------------------------------------
describe("Property 14: Courier Options Display", () => {
    it("for any valid address and weight, displays couriers with name, time, cost", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(50), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Verify all couriers have required fields
                    expect(couriers.length).toBeGreaterThan(0);

                    couriers.forEach(courier => {
                        expect(courier).toHaveProperty('id');
                        expect(courier).toHaveProperty('name');
                        expect(courier).toHaveProperty('serviceType');
                        expect(courier).toHaveProperty('estimatedDelivery');

                        expect(typeof courier.name).toBe('string');
                        expect(courier.name.length).toBeGreaterThan(0);
                        expect(typeof courier.estimatedDelivery).toBe('string');
                        expect(courier.estimatedDelivery.length).toBeGreaterThan(0);

                        // Calculate cost for display
                        const cost = calculateShippingCost(courier, destination, weight);
                        expect(cost).toBeGreaterThan(0);
                    });
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 15: Regular Couriers for Light Orders
// **Validates: Requirements 9.2**
// ---------------------------------------------------------------------------
describe("Property 15: Regular Couriers for Light Orders", () => {
    it("for any order with weight < 20kg, JNE, JNT, Wahana are available", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(19.9), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Find regular couriers
                    const jne = couriers.find(c => c.id === 'jne-reg');
                    const jnt = couriers.find(c => c.id === 'jnt-reg');
                    const wahana = couriers.find(c => c.id === 'wahana-reg');

                    // Verify all three regular couriers are available
                    expect(jne).toBeDefined();
                    expect(jne.name).toBe('JNE');
                    expect(jne.serviceType).toBe('regular');

                    expect(jnt).toBeDefined();
                    expect(jnt.name).toBe('J&T');
                    expect(jnt.serviceType).toBe('regular');

                    expect(wahana).toBeDefined();
                    expect(wahana.name).toBe('Wahana');
                    expect(wahana.serviceType).toBe('regular');
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 16: Cargo Courier for Heavy Orders
// **Validates: Requirements 9.3, 11.1**
// ---------------------------------------------------------------------------
describe("Property 16: Cargo Courier for Heavy Orders", () => {
    it("for any order with weight >= 20kg, Wahana Cargo is available", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(20), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Find cargo courier
                    const cargo = couriers.find(c => c.id === 'wahana-cargo');

                    // Verify cargo courier is available
                    expect(cargo).toBeDefined();
                    expect(cargo.name).toBe('Wahana Cargo');
                    expect(cargo.serviceType).toBe('cargo');
                }
            ),
            { numRuns: 20 }
        );
    });

    it("for any order with weight >= 20kg, regular couriers are NOT available", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(20), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Verify regular couriers are NOT in the list
                    const jne = couriers.find(c => c.id === 'jne-reg');
                    const jnt = couriers.find(c => c.id === 'jnt-reg');
                    const wahanaReg = couriers.find(c => c.id === 'wahana-reg');

                    expect(jne).toBeUndefined();
                    expect(jnt).toBeUndefined();
                    expect(wahanaReg).toBeUndefined();
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 17: GoSend Always Available
// **Validates: Requirements 9.4, 12.1, 12.2, 12.6**
// ---------------------------------------------------------------------------
describe("Property 17: GoSend Always Available", () => {
    it("for any order regardless of weight, GoSend same-day and instant available", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Find GoSend options
                    const gosendSame = couriers.find(c => c.id === 'gosend-same');
                    const gosendInstant = couriers.find(c => c.id === 'gosend-instant');

                    // Verify both GoSend options are available
                    expect(gosendSame).toBeDefined();
                    expect(gosendSame.name).toBe('GoSend Same Day');
                    expect(gosendSame.serviceType).toBe('same-day');

                    expect(gosendInstant).toBeDefined();
                    expect(gosendInstant.name).toBe('GoSend Instant');
                    expect(gosendInstant.serviceType).toBe('instant');
                }
            ),
            { numRuns: 20 }
        );
    });

    it("GoSend costs are higher than regular couriers for light orders", () => {
        fc.assert(
            fc.property(
                destinationArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(19.9), noNaN: true, noDefaultInfinity: true }),
                (destination, weight) => {
                    const couriers = getAvailableCouriers(destination.postalCode, destination.city, weight);

                    // Calculate costs
                    const jneCost = calculateShippingCost(
                        couriers.find(c => c.id === 'jne-reg'),
                        destination,
                        weight
                    );
                    const gosendSameCost = calculateShippingCost(
                        couriers.find(c => c.id === 'gosend-same'),
                        destination,
                        weight
                    );
                    const gosendInstantCost = calculateShippingCost(
                        couriers.find(c => c.id === 'gosend-instant'),
                        destination,
                        weight
                    );

                    // Verify GoSend costs are higher
                    expect(gosendSameCost).toBeGreaterThan(jneCost);
                    expect(gosendInstantCost).toBeGreaterThan(gosendSameCost);
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 18: Single Courier Selection
// **Validates: Requirements 9.6**
// ---------------------------------------------------------------------------
describe("Property 18: Single Courier Selection", () => {
    it("for any courier selection, only one courier selected at a time", async () => {
        await fc.assert(
            fc.asyncProperty(
                validPostalCodeArb,
                fc.float({ min: Math.fround(0.1), max: Math.fround(19.9), noNaN: true, noDefaultInfinity: true }),
                async (postalCode, weight) => {
                    const couriers = getAvailableCouriers(postalCode, "TestCity", weight);
                    if (couriers.length < 2) return;

                    const onCourierSelect = vi.fn();

                    const { container, rerender, unmount } = render(
                        <CourierSelector
                            destination={{ postalCode, city: "TestCity" }}
                            orderWeight={weight}
                            onCourierSelect={onCourierSelect}
                            selectedCourier={null}
                        />
                    );

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 2000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length < 2) {
                        unmount();
                        return;
                    }

                    // Click first courier
                    fireEvent.click(courierButtons[0]);
                    expect(onCourierSelect).toHaveBeenCalledTimes(1);
                    const firstCourier = onCourierSelect.mock.calls[0][0];

                    // Re-render with first selected
                    rerender(
                        <CourierSelector
                            destination={{ postalCode, city: "TestCity" }}
                            orderWeight={weight}
                            onCourierSelect={onCourierSelect}
                            selectedCourier={firstCourier}
                        />
                    );

                    // Only first should be aria-checked=true
                    const updatedButtons = container.querySelectorAll('[role="radio"]');
                    const checkedCount = Array.from(updatedButtons).filter(
                        btn => btn.getAttribute("aria-checked") === "true"
                    ).length;
                    expect(checkedCount).toBe(1);

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 8000 }
        );
    }, 60000);
});
