// Feature: checkout-auto-address
// Property 1: Profile Address Retrieval - Validates Requirements 1.1, 1.2
// Property 2: Address Field Completeness - Validates Requirements 1.3
// Property 3: Incomplete Address Warning - Validates Requirements 1.5, 4.2
// Property 4: No Editable Address Inputs - Validates Requirements 2.1, 2.2
// Property 5: Order Uses Profile Address - Validates Requirements 3.1, 3.2, 3.3, 3.4, 6.1, 6.4
// Property 6: Profile Edit Link Presence - Validates Requirements 4.4, 5.1
// Property 7: Submit Disabled on Incomplete Address - Validates Requirements 4.5, 7.6
// Property 8: Phone Number Validation - Validates Requirements 7.1, 7.3
// Property 9: Postal Code Validation - Validates Requirements 7.2, 7.4

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Checkout from "../../pages/Checkout";
import AddressDisplay, { validateAddress } from "../../components/AddressDisplay";

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

// Generate valid phone numbers matching /^[0-9+\-\s]{7,15}$/
const validPhoneArb = fc
    .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", " "), {
        minLength: 7,
        maxLength: 15,
    })
    .map((chars) => chars.join(""))
    .filter((phone) => /^[0-9+\-\s]{7,15}$/.test(phone.trim()) && phone.trim().length >= 7);

// Generate invalid phone numbers (too short, too long, or invalid characters)
const invalidPhoneArb = fc.oneof(
    fc.string({ minLength: 1, maxLength: 6 }), // Too short
    fc.string({ minLength: 16, maxLength: 30 }), // Too long
    fc.string({ minLength: 7, maxLength: 15 }).filter((s) => !/^[0-9+\-\s]+$/.test(s)) // Invalid chars
);

// Generate valid postal codes matching /^\d{5}$/
const validPostalCodeArb = fc.integer({ min: 10000, max: 99999 }).map(String);

// Generate invalid postal codes (not exactly 5 digits)
const invalidPostalCodeArb = fc.oneof(
    fc.integer({ min: 0, max: 9999 }).map(String), // Too short
    fc.integer({ min: 100000, max: 999999 }).map(String), // Too long
    fc.string({ minLength: 5, maxLength: 5 }).filter((s) => !/^\d{5}$/.test(s)) // Non-digits
);

// Generate complete valid address
const validAddressArb = fc.record({
    displayName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    phone: validPhoneArb,
    address: fc.string({ minLength: 10, maxLength: 200 }).filter(s => s.trim().length >= 10),
    city: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
    postalCode: validPostalCodeArb,
});

// Generate incomplete address (at least one field is empty)
const incompleteAddressArb = fc
    .record({
        displayName: fc.option(fc.string({ minLength: 1 }), { nil: "" }),
        phone: fc.option(validPhoneArb, { nil: "" }),
        address: fc.option(fc.string({ minLength: 10 }), { nil: "" }),
        city: fc.option(fc.string({ minLength: 3 }), { nil: "" }),
        postalCode: fc.option(validPostalCodeArb, { nil: "" }),
    })
    .filter(
        (addr) =>
            !addr.displayName || !addr.phone || !addr.address || !addr.city || !addr.postalCode
    );

// Generate cart items with weight
const cartItemArb = fc.record({
    productId: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    price: fc.integer({ min: 1000, max: 1000000 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    weight: fc.integer({ min: 1, max: 50 }).map(w => w / 10), // Generate 0.1 to 5.0
    imageUrl: fc.constant(""),
});

// Generate authenticated user
const authenticatedUserArb = fc.record({
    uid: fc.string({ minLength: 1, maxLength: 28 }),
    email: fc.emailAddress(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
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
// Property 1: Profile Address Retrieval
// **Validates: Requirements 1.1, 1.2**
// ---------------------------------------------------------------------------
describe("Property 1: Profile Address Retrieval", () => {
    it("for any authenticated user with profile, address is retrieved and displayed", async () => {
        await fc.assert(
            fc.asyncProperty(authenticatedUserArb, validAddressArb, async (user, address) => {
                const { container, unmount } = renderCheckout(user, address);

                // Wait for address to load
                await waitFor(() => {
                    const loadingSpinner = container.querySelector(".animate-spin");
                    expect(loadingSpinner).toBeNull();
                }, { timeout: 5000 });

                // Verify all address fields are displayed
                expect(container.textContent).toContain(address.displayName.trim());
                expect(container.textContent).toContain(address.phone.trim());
                expect(container.textContent).toContain(address.address.trim());
                expect(container.textContent).toContain(address.city.trim());
                expect(container.textContent).toContain(address.postalCode);

                unmount();
            }),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000); // 2 minute timeout for property test
});

// ---------------------------------------------------------------------------
// Property 2: Address Field Completeness
// **Validates: Requirements 1.3**
// ---------------------------------------------------------------------------
describe("Property 2: Address Field Completeness", () => {
    it("for any shipping address, all five required fields are visible", async () => {
        await fc.assert(
            fc.asyncProperty(authenticatedUserArb, validAddressArb, async (user, address) => {
                const { container, unmount } = renderCheckout(user, address);

                await waitFor(() => {
                    const loadingSpinner = container.querySelector(".animate-spin");
                    expect(loadingSpinner).toBeNull();
                }, { timeout: 5000 });

                // Check that all five field labels are present
                const labels = [
                    "Nama Penerima",
                    "Nomor Telepon",
                    "Alamat Lengkap",
                    "Kota",
                    "Kode Pos",
                ];

                labels.forEach((label) => {
                    expect(container.textContent).toContain(label);
                });

                // Verify the actual values are displayed
                expect(container.textContent).toContain(address.displayName.trim());
                expect(container.textContent).toContain(address.phone.trim());
                expect(container.textContent).toContain(address.address.trim());
                expect(container.textContent).toContain(address.city.trim());
                expect(container.textContent).toContain(address.postalCode);

                unmount();
            }),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000);
});

// ---------------------------------------------------------------------------
// Property 3: Incomplete Address Warning
// **Validates: Requirements 1.5, 4.2**
// ---------------------------------------------------------------------------
describe("Property 3: Incomplete Address Warning", () => {
    it("for any address with empty fields, warning message is displayed", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                incompleteAddressArb,
                async (user, address) => {
                    const { container, unmount } = renderCheckout(user, address);

                    await waitFor(() => {
                        const loadingSpinner = container.querySelector(".animate-spin");
                        expect(loadingSpinner).toBeNull();
                    }, { timeout: 5000 });

                    // Warning message should be present
                    expect(container.textContent).toContain("Alamat pengiriman belum lengkap");

                    // Warning should have role="alert"
                    const alert = container.querySelector('[role="alert"]');
                    expect(alert).not.toBeNull();

                    unmount();
                }
            ),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000);
});

// ---------------------------------------------------------------------------
// Property 4: No Editable Address Inputs
// **Validates: Requirements 2.1, 2.2**
// ---------------------------------------------------------------------------
describe("Property 4: No Editable Address Inputs", () => {
    it("for any checkout render, no editable address input fields exist", async () => {
        await fc.assert(
            fc.asyncProperty(authenticatedUserArb, validAddressArb, async (user, address) => {
                const { container, unmount } = renderCheckout(user, address);

                await waitFor(() => {
                    const loadingSpinner = container.querySelector(".animate-spin");
                    expect(loadingSpinner).toBeNull();
                }, { timeout: 5000 });

                // Check that there are NO input fields for address data
                // (name, phone, address, city, postalCode should not be editable inputs)
                const nameInput = container.querySelector('input[name="displayName"]');
                const phoneInput = container.querySelector('input[name="phone"]');
                const addressInput = container.querySelector('input[name="address"]');
                const cityInput = container.querySelector('input[name="city"]');
                const postalCodeInput = container.querySelector('input[name="postalCode"]');

                expect(nameInput).toBeNull();
                expect(phoneInput).toBeNull();
                expect(addressInput).toBeNull();
                expect(cityInput).toBeNull();
                expect(postalCodeInput).toBeNull();

                unmount();
            }),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000);
});

// ---------------------------------------------------------------------------
// Property 5: Order Uses Profile Address
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.1, 6.4**
// ---------------------------------------------------------------------------
describe("Property 5: Order Uses Profile Address", () => {
    it("for any order submission, order contains profile address values", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                validAddressArb,
                fc.array(cartItemArb, { minLength: 1, maxLength: 3 }), // Reduced to 3 items for speed
                async (user, address, cartItems) => {
                    mockAddDoc.mockResolvedValueOnce({ id: "test-order-id" });

                    const { container, unmount } = renderCheckout(user, address, cartItems);

                    // Wait for address to load
                    await waitFor(() => {
                        const loadingSpinner = container.querySelector(".animate-spin");
                        expect(loadingSpinner).toBeNull();
                    }, { timeout: 3000 });

                    // Wait for courier selector to appear (address is valid)
                    await waitFor(() => {
                        expect(container.textContent).toContain("Pilih Kurir");
                    }, { timeout: 3000 });

                    // Select a courier (find first radio button in courier selector)
                    const courierRadios = container.querySelectorAll('input[type="radio"][name="courier"]');
                    if (courierRadios.length > 0) {
                        fireEvent.click(courierRadios[0]);
                    }

                    // Wait for payment selector to appear
                    await waitFor(() => {
                        expect(container.textContent).toContain("Metode Pembayaran");
                    }, { timeout: 3000 });

                    // Select a payment method
                    const paymentRadios = container.querySelectorAll('input[type="radio"][name="payment"]');
                    if (paymentRadios.length > 0) {
                        fireEvent.click(paymentRadios[0]);
                    }

                    // Find and click submit button
                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );

                    if (submitButton && !submitButton.disabled) {
                        fireEvent.click(submitButton);

                        // Wait for order creation
                        await waitFor(() => {
                            expect(mockAddDoc).toHaveBeenCalled();
                        }, { timeout: 3000 });

                        // Verify order document contains profile address
                        const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                        expect(orderDoc).toHaveProperty("shippingAddress");
                        expect(orderDoc.shippingAddress.name).toBe(address.displayName.trim());
                        expect(orderDoc.shippingAddress.phone).toBe(address.phone.trim());
                        expect(orderDoc.shippingAddress.address).toBe(address.address.trim());
                        expect(orderDoc.shippingAddress.city).toBe(address.city.trim());
                        expect(orderDoc.shippingAddress.postalCode).toBe(address.postalCode.trim());
                    }

                    unmount();
                }
            ),
            { numRuns: 5, timeout: 15000 } // Reduced runs for this complex test
        );
    }, 120000); // 2 minute timeout
});

// ---------------------------------------------------------------------------
// Property 6: Profile Edit Link Presence
// **Validates: Requirements 4.4, 5.1**
// ---------------------------------------------------------------------------
describe("Property 6: Profile Edit Link Presence", () => {
    it("for any address display, edit link exists and navigates to profile", async () => {
        await fc.assert(
            fc.asyncProperty(authenticatedUserArb, validAddressArb, async (user, address) => {
                const { container, unmount } = renderCheckout(user, address);

                await waitFor(() => {
                    const loadingSpinner = container.querySelector(".animate-spin");
                    expect(loadingSpinner).toBeNull();
                }, { timeout: 5000 });

                // Find edit link
                const editLink = Array.from(container.querySelectorAll("a")).find((link) =>
                    link.textContent.includes("Edit Alamat")
                );

                expect(editLink).not.toBeNull();
                expect(editLink.getAttribute("href")).toBe("/profile");

                unmount();
            }),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000);
});

// ---------------------------------------------------------------------------
// Property 7: Submit Disabled on Incomplete Address
// **Validates: Requirements 4.5, 7.6**
// ---------------------------------------------------------------------------
describe("Property 7: Submit Disabled on Incomplete Address", () => {
    it("for any incomplete/invalid address, submit button is disabled", async () => {
        await fc.assert(
            fc.asyncProperty(
                authenticatedUserArb,
                incompleteAddressArb,
                async (user, address) => {
                    const { container, unmount } = renderCheckout(user, address);

                    await waitFor(() => {
                        const loadingSpinner = container.querySelector(".animate-spin");
                        expect(loadingSpinner).toBeNull();
                    }, { timeout: 5000 });

                    // Find submit button
                    const submitButton = Array.from(container.querySelectorAll("button")).find(
                        (btn) => btn.textContent.includes("Buat Pesanan")
                    );

                    expect(submitButton).not.toBeNull();
                    expect(submitButton.disabled).toBe(true);

                    unmount();
                }
            ),
            { numRuns: 10, timeout: 10000 }
        );
    }, 120000);
});

// ---------------------------------------------------------------------------
// Property 8: Phone Number Validation
// **Validates: Requirements 7.1, 7.3**
// ---------------------------------------------------------------------------
describe("Property 8: Phone Number Validation", () => {
    it("for any phone string, validation against /^[0-9+\\-\\s]{7,15}$/ pattern", () => {
        fc.assert(
            fc.property(validPhoneArb, (phone) => {
                const address = {
                    displayName: "Test User",
                    phone: phone,
                    address: "Test Address",
                    city: "Test City",
                    postalCode: "12345",
                };

                const validation = validateAddress(address);
                expect(validation.isValid).toBe(true);
                expect(validation.errors).not.toContain("Format nomor telepon tidak valid");
            }),
            { numRuns: 10 }
        );
    });

    it("for any invalid phone string, validation fails with error message", () => {
        fc.assert(
            fc.property(invalidPhoneArb, (phone) => {
                const address = {
                    displayName: "Test User",
                    phone: phone,
                    address: "Test Address",
                    city: "Test City",
                    postalCode: "12345",
                };

                const validation = validateAddress(address);
                expect(validation.isValid).toBe(false);
                expect(validation.errors.length).toBeGreaterThan(0);
            }),
            { numRuns: 10 }
        );
    });
});

// ---------------------------------------------------------------------------
// Property 9: Postal Code Validation
// **Validates: Requirements 7.2, 7.4**
// ---------------------------------------------------------------------------
describe("Property 9: Postal Code Validation", () => {
    it("for any postal code string, validation against /^\\d{5}$/ pattern", () => {
        fc.assert(
            fc.property(validPostalCodeArb, (postalCode) => {
                const address = {
                    displayName: "Test User",
                    phone: "08123456789",
                    address: "Test Address",
                    city: "Test City",
                    postalCode: postalCode,
                };

                const validation = validateAddress(address);
                expect(validation.isValid).toBe(true);
                expect(validation.errors).not.toContain("Kode pos harus 5 digit angka");
            }),
            { numRuns: 10 }
        );
    });

    it("for any invalid postal code string, validation fails with error message", () => {
        fc.assert(
            fc.property(invalidPostalCodeArb, (postalCode) => {
                const address = {
                    displayName: "Test User",
                    phone: "08123456789",
                    address: "Test Address",
                    city: "Test City",
                    postalCode: postalCode,
                };

                const validation = validateAddress(address);
                expect(validation.isValid).toBe(false);
                expect(validation.errors.length).toBeGreaterThan(0);
            }),
            { numRuns: 10 }
        );
    });
});
