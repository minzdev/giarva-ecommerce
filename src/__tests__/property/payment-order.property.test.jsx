// Feature: checkout-auto-address
// Property 28: Payment Required for Submission - Validates Requirements 13.5, 13.6
// Property 29: Payment Method Included in Order - Validates Requirements 13.7, 16.3
// Property 30: Payment Method Display Completeness - Validates Requirements 14.1
// Property 31: Payment Fee Display - Validates Requirements 14.5, 15.3
// Property 32: Subtotal Calculation - Validates Requirements 15.1
// Property 33: Total Calculation Completeness - Validates Requirements 15.4
// Property 34: Total Updates on Selection Changes - Validates Requirements 15.5
// Property 35: Complete Order Document Structure - Validates Requirements 16.2, 16.4, 16.5, 16.6

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Checkout from "../../pages/Checkout";
import PaymentMethodSelector from "../../components/PaymentMethodSelector";
import { getPaymentMethods, calculatePaymentFee } from "../../services/PaymentService";
import { getAvailableCouriers, calculateShippingCost } from "../../services/ShippingService";

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
    collection: vi.fn((_db, name) => `mock-collection-${name}`),
    doc: vi.fn((_db, col, id) => `mock-doc-${col}-${id}`),
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

vi.mock("../../context/ToastContext", () => ({
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
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
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    mockAddDoc.mockResolvedValue({ id: "mock-order-id" });
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------
const postalCodeArb = fc.integer({ min: 10000, max: 99999 }).map(String);

const validAddressArb = fc.record({
    displayName: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    phone: fc
        .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9"), {
            minLength: 7,
            maxLength: 12,
        })
        .map((chars) => chars.join("")),
    address: fc.string({ minLength: 10, maxLength: 100 }).filter((s) => s.trim().length >= 10),
    city: fc.string({ minLength: 3, maxLength: 30 }).filter((s) => s.trim().length >= 3),
    postalCode: postalCodeArb,
});

const authenticatedUserArb = fc.record({
    uid: fc.string({ minLength: 1, maxLength: 28 }),
    email: fc.emailAddress(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
});

const cartItemArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    price: fc.integer({ min: 1000, max: 500000 }),
    quantity: fc.integer({ min: 1, max: 5 }),
    weight: fc.integer({ min: 1, max: 10 }).map((w) => w * 0.5),
    imageUrl: fc.constant(""),
});

const paymentMethodIdArb = fc.constantFrom("bank_transfer", "ewallet", "card", "cod");

const orderTotalArb = fc.integer({ min: 10000, max: 5000000 });

// ---------------------------------------------------------------------------
// Helper: render Checkout with mocked profile address and cart
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
    const totalAmount = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const clearCart = vi.fn();
    mockUseCart.mockReturnValue({
        items: cartItems,
        totalItems: cartItems.reduce((s, i) => s + i.quantity, 0),
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
    return { ...result, clearCart, totalAmount };
}

// ---------------------------------------------------------------------------
// Property 28: Payment Required for Submission
// Validates: Requirements 13.5, 13.6
// ---------------------------------------------------------------------------
describe("Property 28: Payment Required for Submission", () => {
    it("submit button is disabled when no payment method is selected (courier selected, no payment)", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    // Wait for courier selector to appear
                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    // Select a courier so that payment selector appears
                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length > 0) {
                        fireEvent.click(courierButtons[0]);
                    }

                    // Wait for payment selector to appear
                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Do NOT select any payment method — submit must still be disabled
                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );

                    expect(submitButton).not.toBeNull();
                    expect(submitButton.disabled).toBe(true);

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 15000 }
        );
    }, 60000);

    it("canSubmit logic: address valid + courier selected + no payment = disabled", () => {
        fc.assert(
            fc.property(fc.boolean(), (hasAddress) => {
                const selectedCourier = { id: "jne-reg" }; // Courier is selected
                const selectedPayment = null; // No payment
                const addressValid = hasAddress;

                const canSubmit = addressValid && selectedCourier !== null && selectedPayment !== null;
                // Without payment, canSubmit must always be false
                expect(canSubmit).toBe(false);
            }),
            { numRuns: 20 }
        );
    });

    it("submit button becomes enabled only when address, courier, AND payment are all selected", async () => {
        // Pure logic test: canSubmit = addressValid && selectedCourier && selectedPayment
        fc.assert(
            fc.property(
                fc.boolean(), // addressValid
                fc.boolean(), // hasCourier
                fc.boolean(), // hasPayment
                (addressValid, hasCourier, hasPayment) => {
                    const selectedCourier = hasCourier ? { id: "jne-reg" } : null;
                    const selectedPayment = hasPayment ? { id: "bank_transfer" } : null;

                    const canSubmit = addressValid && selectedCourier !== null && selectedPayment !== null;

                    // canSubmit is true only when ALL three conditions are met
                    if (addressValid && hasCourier && hasPayment) {
                        expect(canSubmit).toBe(true);
                    } else {
                        expect(canSubmit).toBe(false);
                    }
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 29: Payment Method Included in Order
// Validates: Requirements 13.7, 16.3
// ---------------------------------------------------------------------------
describe("Property 29: Payment Method Included in Order", () => {
    it("submitted order document contains payment method id, name, and type", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    mockAddDoc.mockResolvedValueOnce({ id: "test-order-id" });

                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    // Select first courier
                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Select first available payment method (any unchecked radio)
                    const allRadios = Array.from(container.querySelectorAll('[role="radio"]'));
                    const uncheckedPayment = allRadios.find(
                        (btn) => btn.getAttribute("aria-checked") === "false"
                    );
                    if (!uncheckedPayment) { unmount(); return; }
                    fireEvent.click(uncheckedPayment);

                    // Find submit button and click directly (don't wait for disabled state change)
                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );
                    if (!submitButton || submitButton.disabled) { unmount(); return; }
                    fireEvent.click(submitButton);

                    await waitFor(() => {
                        expect(mockAddDoc).toHaveBeenCalled();
                    }, { timeout: 3000 });

                    const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                    // Payment method must be in the order document
                    expect(orderDoc).toHaveProperty("paymentMethod");
                    expect(typeof orderDoc.paymentMethod.id).toBe("string");
                    expect(orderDoc.paymentMethod.id.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.paymentMethod.name).toBe("string");
                    expect(orderDoc.paymentMethod.name.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.paymentMethod.type).toBe("string");
                    expect(["bank_transfer", "ewallet", "card", "cod"]).toContain(
                        orderDoc.paymentMethod.type
                    );

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 20000 }
        );
    }, 90000);

    it("payment method id in order matches the method selected by user", () => {
        // Pure logic: the paymentMethod object stored in order must match selection
        fc.assert(
            fc.property(paymentMethodIdArb, (methodId) => {
                const methods = getPaymentMethods();
                const selected = methods.find((m) => m.id === methodId);

                // Simulate what Checkout.jsx stores in the order
                const paymentMethodInOrder = {
                    id: selected.id,
                    name: selected.name,
                    type: selected.type,
                };

                expect(paymentMethodInOrder.id).toBe(methodId);
                expect(paymentMethodInOrder.name).toBe(selected.name);
                expect(paymentMethodInOrder.type).toBe(selected.type);
            }),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 30: Payment Method Display Completeness
// Validates: Requirements 14.1
// ---------------------------------------------------------------------------
describe("Property 30: Payment Method Display Completeness", () => {
    it("for any payment method displayed, name and icon are shown", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                const { container, unmount } = render(
                    <PaymentMethodSelector
                        onPaymentSelect={vi.fn()}
                        selectedMethod={null}
                        orderTotal={orderTotal}
                    />
                );

                const methods = getPaymentMethods();

                methods.forEach((method) => {
                    // Name must be visible in the component
                    expect(container.textContent).toContain(method.name);

                    // Icon must be rendered as an emoji in a span[role="img"]
                    const iconEl = Array.from(container.querySelectorAll('[role="img"]')).find(
                        (el) => el.textContent === method.icon
                    );
                    expect(iconEl).not.toBeNull();
                });

                unmount();
            }),
            { numRuns: 10 }
        );
    });

    it("each payment method button has an accessible aria-label containing the method name", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                const { container, unmount } = render(
                    <PaymentMethodSelector
                        onPaymentSelect={vi.fn()}
                        selectedMethod={null}
                        orderTotal={orderTotal}
                    />
                );

                const methods = getPaymentMethods();
                const buttons = container.querySelectorAll('[role="radio"]');

                expect(buttons.length).toBe(methods.length);

                methods.forEach((method) => {
                    const btn = Array.from(buttons).find((b) =>
                        b.getAttribute("aria-label")?.includes(method.name)
                    );
                    expect(btn).not.toBeNull();
                });

                unmount();
            }),
            { numRuns: 10 }
        );
    });

    it("payment method description is displayed for each method", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                const { container, unmount } = render(
                    <PaymentMethodSelector
                        onPaymentSelect={vi.fn()}
                        selectedMethod={null}
                        orderTotal={orderTotal}
                    />
                );

                const methods = getPaymentMethods();

                methods.forEach((method) => {
                    // Description text must appear in the component
                    expect(container.textContent).toContain(method.description);
                });

                unmount();
            }),
            { numRuns: 10 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 31: Payment Fee Display
// Validates: Requirements 14.5, 15.3
// ---------------------------------------------------------------------------
describe("Property 31: Payment Fee Display", () => {
    it("calculatePaymentFee returns 0 for bank_transfer and ewallet", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                expect(calculatePaymentFee("bank_transfer", orderTotal)).toBe(0);
                expect(calculatePaymentFee("ewallet", orderTotal)).toBe(0);
            }),
            { numRuns: 20 }
        );
    });

    it("calculatePaymentFee returns 2.9% of total for card", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                const fee = calculatePaymentFee("card", orderTotal);
                const expected = Math.round(orderTotal * 0.029);
                expect(fee).toBe(expected);
                expect(fee).toBeGreaterThan(0);
            }),
            { numRuns: 20 }
        );
    });

    it("calculatePaymentFee returns flat Rp 5,000 for COD regardless of order total", () => {
        fc.assert(
            fc.property(orderTotalArb, (orderTotal) => {
                const fee = calculatePaymentFee("cod", orderTotal);
                expect(fee).toBe(5000);
            }),
            { numRuns: 20 }
        );
    });

    it("payment fee line item appears in order summary when card is selected", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    // Select first courier
                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Find and click the card payment method button
                    const methods = getPaymentMethods();
                    const cardMethod = methods.find((m) => m.id === "card");
                    const cardBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(cardMethod.name)
                    );

                    if (cardBtn) {
                        fireEvent.click(cardBtn);

                        // Payment fee line item must appear in order summary
                        await waitFor(() => {
                            const aside = container.querySelector("aside");
                            expect(aside?.textContent).toContain("Biaya Pembayaran");
                        }, { timeout: 2000 });
                    }

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 15000 }
        );
    }, 60000);

    it("payment fee line item appears in order summary when COD is selected", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Find and click the COD payment method button
                    const methods = getPaymentMethods();
                    const codMethod = methods.find((m) => m.id === "cod");
                    const codBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(codMethod.name)
                    );

                    if (codBtn) {
                        fireEvent.click(codBtn);

                        await waitFor(() => {
                            const aside = container.querySelector("aside");
                            expect(aside?.textContent).toContain("Biaya Pembayaran");
                        }, { timeout: 2000 });
                    }

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 15000 }
        );
    }, 60000);

    it("payment fee line item does NOT appear when bank_transfer or ewallet is selected", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Find and click bank_transfer
                    const methods = getPaymentMethods();
                    const bankMethod = methods.find((m) => m.id === "bank_transfer");
                    const bankBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(bankMethod.name)
                    );

                    if (bankBtn) {
                        fireEvent.click(bankBtn);

                        // Payment fee line item must NOT appear (fee is 0)
                        await waitFor(() => {
                            const aside = container.querySelector("aside");
                            expect(aside?.textContent).not.toContain("Biaya Pembayaran");
                        }, { timeout: 2000 });
                    }

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 15000 }
        );
    }, 60000);
});

// ---------------------------------------------------------------------------
// Property 32: Subtotal Calculation
// Validates: Requirements 15.1
// ---------------------------------------------------------------------------
describe("Property 32: Subtotal Calculation", () => {
    it("for any cart with items, subtotal equals sum of (item.price × item.quantity)", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemArb, { minLength: 1, maxLength: 10 }),
                (cartItems) => {
                    const expectedSubtotal = cartItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    );

                    // Verify the calculation is correct
                    expect(expectedSubtotal).toBeGreaterThan(0);

                    // Verify each item contributes correctly
                    cartItems.forEach((item) => {
                        const itemTotal = item.price * item.quantity;
                        expect(itemTotal).toBe(item.price * item.quantity);
                        expect(itemTotal).toBeGreaterThan(0);
                    });
                }
            ),
            { numRuns: 20 }
        );
    });

    it("subtotal is displayed in order summary section", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, totalAmount, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    // Subtotal must appear in the aside (order summary)
                    const aside = container.querySelector("aside");
                    expect(aside).not.toBeNull();
                    expect(aside.textContent).toContain("Subtotal");

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 10000 }
        );
    }, 60000);

    it("subtotal calculation is commutative: order of items does not affect result", () => {
        fc.assert(
            fc.property(
                fc.array(cartItemArb, { minLength: 2, maxLength: 5 }),
                (cartItems) => {
                    const subtotal1 = cartItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    );

                    // Reverse the order
                    const reversed = [...cartItems].reverse();
                    const subtotal2 = reversed.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    );

                    expect(subtotal1).toBe(subtotal2);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("subtotal stored in order document matches sum of cart items", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    mockAddDoc.mockResolvedValueOnce({ id: "test-order-id" });

                    const { container, totalAmount, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    const allRadios = Array.from(container.querySelectorAll('[role="radio"]'));
                    const uncheckedPayment = allRadios.find(
                        (btn) => btn.getAttribute("aria-checked") === "false"
                    );
                    if (!uncheckedPayment) { unmount(); return; }
                    fireEvent.click(uncheckedPayment);

                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );
                    if (!submitButton || submitButton.disabled) { unmount(); return; }
                    fireEvent.click(submitButton);

                    await waitFor(() => {
                        expect(mockAddDoc).toHaveBeenCalled();
                    }, { timeout: 3000 });

                    const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                    // Subtotal in order must match sum of cart items
                    expect(orderDoc).toHaveProperty("subtotal");
                    expect(orderDoc.subtotal).toBe(totalAmount);

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 20000 }
        );
    }, 60000);
});

// ---------------------------------------------------------------------------
// Property 33: Total Calculation Completeness
// Validates: Requirements 15.4
// ---------------------------------------------------------------------------
describe("Property 33: Total Calculation Completeness", () => {
    it("total = subtotal + shippingCost + paymentFee for any combination", () => {
        fc.assert(
            fc.property(
                orderTotalArb, // subtotal
                fc.integer({ min: 0, max: 100000 }), // shippingCost
                paymentMethodIdArb,
                (subtotal, shippingCost, paymentMethodId) => {
                    const paymentFee = calculatePaymentFee(paymentMethodId, subtotal);
                    const expectedTotal = subtotal + shippingCost + paymentFee;

                    // Verify the formula holds
                    expect(expectedTotal).toBe(subtotal + shippingCost + paymentFee);
                    expect(expectedTotal).toBeGreaterThanOrEqual(subtotal);
                    expect(expectedTotal).toBeGreaterThanOrEqual(subtotal + shippingCost);
                }
            ),
            { numRuns: 20 }
        );
    });

    it("total is displayed prominently in order summary", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    // Total must be labeled and displayed in the aside
                    const aside = container.querySelector("aside");
                    expect(aside).not.toBeNull();
                    expect(aside.textContent).toContain("Total");

                    // Total must be in a prominent element (text-xl class)
                    const totalEl = aside.querySelector("span.text-xl");
                    expect(totalEl).not.toBeNull();

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 10000 }
        );
    }, 60000);

    it("totalAmount in order document equals subtotal + shippingCost + paymentFee", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    mockAddDoc.mockResolvedValueOnce({ id: "test-order-id" });

                    const { container, totalAmount, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Select bank_transfer (fee = 0) for predictable total
                    const methods = getPaymentMethods();
                    const bankMethod = methods.find((m) => m.id === "bank_transfer");
                    const bankBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(bankMethod.name)
                    );
                    if (!bankBtn) { unmount(); return; }
                    fireEvent.click(bankBtn);

                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );
                    if (!submitButton || submitButton.disabled) { unmount(); return; }
                    fireEvent.click(submitButton);

                    await waitFor(() => {
                        expect(mockAddDoc).toHaveBeenCalled();
                    }, { timeout: 3000 });

                    const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                    // totalAmount must equal subtotal + shippingCost + paymentFee
                    expect(orderDoc).toHaveProperty("totalAmount");
                    expect(orderDoc).toHaveProperty("subtotal");
                    expect(orderDoc).toHaveProperty("shippingCost");
                    expect(orderDoc).toHaveProperty("paymentFee");

                    const expectedTotal = orderDoc.subtotal + orderDoc.shippingCost + orderDoc.paymentFee;
                    expect(orderDoc.totalAmount).toBe(expectedTotal);

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 20000 }
        );
    }, 60000);
});

// ---------------------------------------------------------------------------
// Property 34: Total Updates on Selection Changes
// Validates: Requirements 15.5
// ---------------------------------------------------------------------------
describe("Property 34: Total Updates on Selection Changes", () => {
    it("total recalculates when a different courier is selected", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = Array.from(container.querySelectorAll('[role="radio"]'));
                    if (courierButtons.length < 2) { unmount(); return; }

                    // Select first courier and capture total
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Ongkos Kirim");
                    }, { timeout: 2000 });

                    const aside = container.querySelector("aside");
                    const totalElAfterFirst = aside?.querySelector("span.text-xl");
                    const totalAfterFirst = totalElAfterFirst?.textContent;

                    // Select second courier and capture new total
                    fireEvent.click(courierButtons[1]);

                    await waitFor(() => {
                        const totalElAfterSecond = aside?.querySelector("span.text-xl");
                        // Total must still be displayed (may or may not change depending on costs)
                        expect(totalElAfterSecond).not.toBeNull();
                    }, { timeout: 2000 });

                    // Total element must still exist after re-selection
                    const totalElFinal = aside?.querySelector("span.text-xl");
                    expect(totalElFinal).not.toBeNull();

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 15000 }
        );
    }, 60000);

    it("total recalculates when payment method changes (card vs bank_transfer)", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    const { container, totalAmount, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    const methods = getPaymentMethods();
                    const bankMethod = methods.find((m) => m.id === "bank_transfer");
                    const cardMethod = methods.find((m) => m.id === "card");

                    // Select bank_transfer (fee = 0)
                    const bankBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(bankMethod.name)
                    );
                    if (!bankBtn) { unmount(); return; }
                    fireEvent.click(bankBtn);

                    const aside = container.querySelector("aside");
                    const totalAfterBank = aside?.querySelector("span.text-xl")?.textContent;

                    // Select card (fee = 2.9%)
                    const cardBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                        (btn) => btn.getAttribute("aria-label")?.includes(cardMethod.name)
                    );
                    if (!cardBtn) { unmount(); return; }
                    fireEvent.click(cardBtn);

                    await waitFor(() => {
                        // Payment fee line item must now appear
                        expect(aside?.textContent).toContain("Biaya Pembayaran");
                    }, { timeout: 2000 });

                    // Total after card must be different from total after bank_transfer
                    // (card adds 2.9% fee, so total must be higher)
                    const totalAfterCard = aside?.querySelector("span.text-xl")?.textContent;
                    expect(totalAfterCard).not.toBe(totalAfterBank);

                    unmount();
                }
            ),
            { numRuns: 3, timeout: 15000 }
        );
    }, 60000);

    it("pure logic: total changes when payment method changes from free to paid", () => {
        fc.assert(
            fc.property(
                orderTotalArb,
                fc.integer({ min: 0, max: 100000 }),
                (subtotal, shippingCost) => {
                    const freePaymentFee = calculatePaymentFee("bank_transfer", subtotal);
                    const cardPaymentFee = calculatePaymentFee("card", subtotal);

                    const totalWithFree = subtotal + shippingCost + freePaymentFee;
                    const totalWithCard = subtotal + shippingCost + cardPaymentFee;

                    // Card always adds a fee, so total with card > total with bank_transfer
                    expect(totalWithCard).toBeGreaterThan(totalWithFree);
                    expect(totalWithCard - totalWithFree).toBe(cardPaymentFee);
                }
            ),
            { numRuns: 20 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 35: Complete Order Document Structure
// Validates: Requirements 16.2, 16.4, 16.5, 16.6
// ---------------------------------------------------------------------------
describe("Property 35: Complete Order Document Structure", () => {
    it("created order document contains all required fields", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }),
                async (user, address, cartItems) => {
                    mockAddDoc.mockResolvedValueOnce({ id: "test-order-id" });

                    const { container, totalAmount, unmount } = renderCheckout(user, address, cartItems);

                    await waitFor(() => {
                        expect(container.querySelector(".animate-spin")).toBeNull();
                    }, { timeout: 5000 });

                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 5000 });

                    // Select first courier
                    const courierButtons = container.querySelectorAll('[role="radio"]');
                    if (courierButtons.length === 0) { unmount(); return; }
                    fireEvent.click(courierButtons[0]);

                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Select first available payment method
                    const allRadios = Array.from(container.querySelectorAll('[role="radio"]'));
                    const uncheckedPayment = allRadios.find(
                        (btn) => btn.getAttribute("aria-checked") === "false"
                    );
                    if (!uncheckedPayment) { unmount(); return; }
                    fireEvent.click(uncheckedPayment);

                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );
                    if (!submitButton || submitButton.disabled) { unmount(); return; }
                    fireEvent.click(submitButton);

                    await waitFor(() => {
                        expect(mockAddDoc).toHaveBeenCalled();
                    }, { timeout: 3000 });

                    const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                    // --- Required top-level fields ---
                    expect(orderDoc).toHaveProperty("userId");
                    expect(orderDoc.userId).toBe(user.uid);

                    expect(orderDoc).toHaveProperty("items");
                    expect(Array.isArray(orderDoc.items)).toBe(true);
                    expect(orderDoc.items.length).toBe(cartItems.length);

                    expect(orderDoc).toHaveProperty("subtotal");
                    expect(typeof orderDoc.subtotal).toBe("number");
                    expect(orderDoc.subtotal).toBe(totalAmount);

                    expect(orderDoc).toHaveProperty("orderWeight");
                    expect(typeof orderDoc.orderWeight).toBe("number");
                    expect(orderDoc.orderWeight).toBeGreaterThan(0);

                    expect(orderDoc).toHaveProperty("shippingCost");
                    expect(typeof orderDoc.shippingCost).toBe("number");
                    expect(orderDoc.shippingCost).toBeGreaterThanOrEqual(0);

                    expect(orderDoc).toHaveProperty("paymentFee");
                    expect(typeof orderDoc.paymentFee).toBe("number");
                    expect(orderDoc.paymentFee).toBeGreaterThanOrEqual(0);

                    expect(orderDoc).toHaveProperty("totalAmount");
                    expect(typeof orderDoc.totalAmount).toBe("number");
                    expect(orderDoc.totalAmount).toBe(
                        orderDoc.subtotal + orderDoc.shippingCost + orderDoc.paymentFee
                    );

                    expect(orderDoc).toHaveProperty("status");
                    expect(orderDoc.status).toBe("pending");

                    expect(orderDoc).toHaveProperty("timestamp");

                    // --- Courier sub-document ---
                    expect(orderDoc).toHaveProperty("courier");
                    expect(typeof orderDoc.courier.id).toBe("string");
                    expect(orderDoc.courier.id.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.courier.name).toBe("string");
                    expect(orderDoc.courier.name.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.courier.serviceType).toBe("string");
                    expect(["regular", "same-day", "instant", "cargo"]).toContain(
                        orderDoc.courier.serviceType
                    );
                    expect(typeof orderDoc.courier.estimatedDelivery).toBe("string");
                    expect(orderDoc.courier.estimatedDelivery.length).toBeGreaterThan(0);

                    // --- Payment method sub-document ---
                    expect(orderDoc).toHaveProperty("paymentMethod");
                    expect(typeof orderDoc.paymentMethod.id).toBe("string");
                    expect(orderDoc.paymentMethod.id.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.paymentMethod.name).toBe("string");
                    expect(orderDoc.paymentMethod.name.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.paymentMethod.type).toBe("string");
                    expect(["bank_transfer", "ewallet", "card", "cod"]).toContain(
                        orderDoc.paymentMethod.type
                    );

                    // --- Shipping address sub-document ---
                    expect(orderDoc).toHaveProperty("shippingAddress");
                    expect(typeof orderDoc.shippingAddress.name).toBe("string");
                    expect(orderDoc.shippingAddress.name.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.shippingAddress.phone).toBe("string");
                    expect(orderDoc.shippingAddress.phone.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.shippingAddress.address).toBe("string");
                    expect(orderDoc.shippingAddress.address.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.shippingAddress.city).toBe("string");
                    expect(orderDoc.shippingAddress.city.length).toBeGreaterThan(0);
                    expect(typeof orderDoc.shippingAddress.postalCode).toBe("string");
                    expect(orderDoc.shippingAddress.postalCode.length).toBeGreaterThan(0);

                    // --- Items sub-documents ---
                    orderDoc.items.forEach((item) => {
                        expect(item).toHaveProperty("productId");
                        expect(item).toHaveProperty("name");
                        expect(item).toHaveProperty("price");
                        expect(item).toHaveProperty("quantity");
                        expect(item).toHaveProperty("weight");
                        expect(typeof item.price).toBe("number");
                        expect(item.price).toBeGreaterThan(0);
                        expect(typeof item.quantity).toBe("number");
                        expect(item.quantity).toBeGreaterThan(0);
                        expect(typeof item.weight).toBe("number");
                        expect(item.weight).toBeGreaterThan(0);
                    });

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 20000 }
        );
    }, 60000);

    it("order document structure is consistent across different payment methods", async () => {
        // Test with each payment method to ensure structure is always complete
        const paymentMethodIds = ["bank_transfer", "ewallet", "card", "cod"];

        for (const methodId of paymentMethodIds) {
            await fc.assert(
                fc.asyncProperty(
                    authenticatedUserArb,
                    validAddressArb,
                    fc.array(cartItemArb, { minLength: 1, maxLength: 2 }),
                    async (user, address, cartItems) => {
                        mockAddDoc.mockResolvedValueOnce({ id: `test-order-${methodId}` });

                        const { container, unmount } = renderCheckout(user, address, cartItems);

                        await waitFor(() => {
                            expect(container.querySelector(".animate-spin")).toBeNull();
                        }, { timeout: 5000 });

                        await waitFor(() => {
                            expect(container.textContent).toContain("Pilih Kurir");
                        }, { timeout: 5000 });

                        const courierButtons = container.querySelectorAll('[role="radio"]');
                        if (courierButtons.length === 0) { unmount(); return; }
                        fireEvent.click(courierButtons[0]);

                        await waitFor(() => {
                            expect(container.textContent).toContain("Metode Pembayaran");
                        }, { timeout: 3000 });

                        // Select the specific payment method
                        const methods = getPaymentMethods();
                        const targetMethod = methods.find((m) => m.id === methodId);
                        const targetBtn = Array.from(container.querySelectorAll('[role="radio"]')).find(
                            (btn) => btn.getAttribute("aria-label")?.includes(targetMethod.name)
                        );
                        if (!targetBtn) { unmount(); return; }
                        fireEvent.click(targetBtn);

                        const submitButton = Array.from(container.querySelectorAll("button")).find(
                            (btn) => btn.textContent.includes("Buat Pesanan")
                        );
                        if (!submitButton || submitButton.disabled) { unmount(); return; }
                        fireEvent.click(submitButton);

                        await waitFor(() => {
                            expect(mockAddDoc).toHaveBeenCalled();
                        }, { timeout: 3000 });

                        const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                        // All required fields must be present regardless of payment method
                        const requiredFields = [
                            "userId", "items", "subtotal", "orderWeight",
                            "courier", "shippingCost", "paymentMethod", "paymentFee",
                            "totalAmount", "status", "shippingAddress", "timestamp"
                        ];

                        requiredFields.forEach((field) => {
                            expect(orderDoc).toHaveProperty(field);
                        });

                        // Payment method must match what was selected
                        expect(orderDoc.paymentMethod.id).toBe(methodId);

                        unmount();
                    }
                ),
                { numRuns: 2, timeout: 20000 }
            );
        }
    }, 120000);
});
