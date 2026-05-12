// Feature: giarva-ecommerce, Property 1: ProtectedRoute selalu redirect guest user
// Feature: giarva-ecommerce, Property 2: ProductDetail route menerima sembarang productId
// Feature: giarva-ecommerce, Property 3: CheckoutForm menampilkan semua field cart items
// Feature: giarva-ecommerce, Property 4: Order document memiliki semua required fields
// Feature: giarva-ecommerce, Property 5: Checkout error tidak menghilangkan cart data

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";

// ---------------------------------------------------------------------------
// Mock Firebase SDK so tests run without real Firebase credentials
// ---------------------------------------------------------------------------
vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(() => ({ name: "mock-app" })),
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => ({ type: "mock-auth" })),
    onAuthStateChanged: vi.fn(() => vi.fn()), // returns unsubscribe fn
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
    signOut: vi.fn(),
}));

const mockAddDoc = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({ type: "mock-db" })),
    collection: vi.fn((_db, collectionName) => `mock-collection-${collectionName}`),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    addDoc: (...args) => mockAddDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
    Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}));

// ---------------------------------------------------------------------------
// Mock useProduct hook so ProductDetail renders without real Firestore calls
// ---------------------------------------------------------------------------
vi.mock("../../hooks/useProduct", () => ({
    useProduct: vi.fn(() => ({ product: null, loading: true, error: null })),
    useProducts: vi.fn(() => ({ products: [], loading: true, error: null })),
    default: vi.fn(() => ({ product: null, loading: true, error: null })),
}));

// ---------------------------------------------------------------------------
// Mock useCart hook so ProductDetail renders without CartProvider
// ---------------------------------------------------------------------------
const mockUseCart = vi.fn();
vi.mock("../../hooks/useCart", () => ({
    useCart: () => mockUseCart(),
    default: () => mockUseCart(),
}));

// ---------------------------------------------------------------------------
// Mock useAuth hook for checkout tests
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock("../../hooks/useAuth", () => ({
    useAuth: () => mockUseAuth(),
    default: () => mockUseAuth(),
}));



// ---------------------------------------------------------------------------
// Default mock setup for useCart and useAuth (used by Properties 1 & 2)
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
    mockAddDoc.mockResolvedValue({ id: "mock-order-id" });
});

// ---------------------------------------------------------------------------
// Property 1 — ProtectedRoute selalu redirect guest user
// **Validates: Requirements 3.4, 3.7**
// ---------------------------------------------------------------------------

describe("Property 1: ProtectedRoute selalu redirect guest user", () => {
    it(
        "untuk setiap auth state, jika user = null (guest) maka redirect ke /login, jika user authenticated maka render children",
        () => {
            fc.assert(
                fc.property(
                    // Generate boolean: true = authenticated, false = guest
                    fc.boolean(),
                    (isAuthenticated) => {
                        // Mock user object for authenticated state
                        const mockUser = isAuthenticated
                            ? { uid: "test-uid", email: "test@example.com", displayName: "Test User" }
                            : null;

                        // Set up useAuth mock for this iteration
                        mockUseAuth.mockReturnValue({
                            user: mockUser,
                            loading: false,
                            signIn: vi.fn(),
                            signUp: vi.fn(),
                            signOut: vi.fn(),
                        });

                        const { container, unmount } = render(
                            <MemoryRouter initialEntries={["/checkout"]}>
                                <Routes>
                                    <Route
                                        path="/checkout"
                                        element={
                                            <ProtectedRoute>
                                                <div data-testid="checkout-page">Checkout Page</div>
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/login"
                                        element={<div data-testid="login-page">Login Page</div>}
                                    />
                                </Routes>
                            </MemoryRouter>
                        );

                        // Verify behavior based on auth state
                        if (isAuthenticated) {
                            // User authenticated: should render children (checkout page)
                            const checkoutPage = container.querySelector('[data-testid="checkout-page"]');
                            expect(checkoutPage).not.toBeNull();
                            expect(checkoutPage.textContent).toBe("Checkout Page");

                            // Should NOT be on login page
                            const loginPage = container.querySelector('[data-testid="login-page"]');
                            expect(loginPage).toBeNull();
                        } else {
                            // User is guest (null): should redirect to /login
                            const loginPage = container.querySelector('[data-testid="login-page"]');
                            expect(loginPage).not.toBeNull();
                            expect(loginPage.textContent).toBe("Login Page");

                            // Should NOT render checkout page
                            const checkoutPage = container.querySelector('[data-testid="checkout-page"]');
                            expect(checkoutPage).toBeNull();
                        }

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "ProtectedRoute dengan user = null selalu redirect ke /login",
        () => {
            fc.assert(
                fc.property(
                    // Generate arbitrary route paths to ensure redirect works from any protected route
                    fc.constantFrom("/checkout", "/profile", "/orders", "/settings"),
                    (protectedPath) => {
                        mockUseAuth.mockReturnValue({
                            user: null,
                            loading: false,
                            signIn: vi.fn(),
                            signUp: vi.fn(),
                            signOut: vi.fn(),
                        });

                        const { container, unmount } = render(
                            <MemoryRouter initialEntries={[protectedPath]}>
                                <Routes>
                                    <Route
                                        path={protectedPath}
                                        element={
                                            <ProtectedRoute>
                                                <div data-testid="protected-content">Protected Content</div>
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/login"
                                        element={<div data-testid="login-page">Login Page</div>}
                                    />
                                </Routes>
                            </MemoryRouter>
                        );

                        // Must redirect to login
                        const loginPage = container.querySelector('[data-testid="login-page"]');
                        expect(loginPage).not.toBeNull();

                        // Must NOT render protected content
                        const protectedContent = container.querySelector('[data-testid="protected-content"]');
                        expect(protectedContent).toBeNull();

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "ProtectedRoute dengan user authenticated selalu render children",
        () => {
            fc.assert(
                fc.property(
                    // Generate arbitrary user data
                    fc.record({
                        uid: fc.string({ minLength: 1, maxLength: 20 }),
                        email: fc.emailAddress(),
                        displayName: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    (mockUser) => {
                        mockUseAuth.mockReturnValue({
                            user: mockUser,
                            loading: false,
                            signIn: vi.fn(),
                            signUp: vi.fn(),
                            signOut: vi.fn(),
                        });

                        const { container, unmount } = render(
                            <MemoryRouter initialEntries={["/checkout"]}>
                                <Routes>
                                    <Route
                                        path="/checkout"
                                        element={
                                            <ProtectedRoute>
                                                <div data-testid="checkout-page">Checkout Page</div>
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/login"
                                        element={<div data-testid="login-page">Login Page</div>}
                                    />
                                </Routes>
                            </MemoryRouter>
                        );

                        // Must render children (checkout page)
                        const checkoutPage = container.querySelector('[data-testid="checkout-page"]');
                        expect(checkoutPage).not.toBeNull();

                        // Must NOT redirect to login
                        const loginPage = container.querySelector('[data-testid="login-page"]');
                        expect(loginPage).toBeNull();

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "ProtectedRoute dengan loading = true menampilkan LoadingSpinner",
        () => {
            fc.assert(
                fc.property(
                    // Generate boolean for user state (can be null or authenticated during loading)
                    fc.boolean(),
                    (hasUser) => {
                        const mockUser = hasUser
                            ? { uid: "test-uid", email: "test@example.com" }
                            : null;

                        mockUseAuth.mockReturnValue({
                            user: mockUser,
                            loading: true, // Loading state
                            signIn: vi.fn(),
                            signUp: vi.fn(),
                            signOut: vi.fn(),
                        });

                        const { container, unmount } = render(
                            <MemoryRouter initialEntries={["/checkout"]}>
                                <Routes>
                                    <Route
                                        path="/checkout"
                                        element={
                                            <ProtectedRoute>
                                                <div data-testid="checkout-page">Checkout Page</div>
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route
                                        path="/login"
                                        element={<div data-testid="login-page">Login Page</div>}
                                    />
                                </Routes>
                            </MemoryRouter>
                        );

                        // During loading: should show spinner (has specific classes)
                        // LoadingSpinner renders a div with animate-spin class
                        const spinner = container.querySelector(".animate-spin");
                        expect(spinner).not.toBeNull();

                        // Should NOT render checkout page or login page during loading
                        const checkoutPage = container.querySelector('[data-testid="checkout-page"]');
                        expect(checkoutPage).toBeNull();

                        const loginPage = container.querySelector('[data-testid="login-page"]');
                        expect(loginPage).toBeNull();

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 2 — ProductDetail route menerima sembarang productId
// **Validates: Requirements 3.2**
// ---------------------------------------------------------------------------

import ProductDetail from "../../pages/ProductDetail";

describe("Property 2: ProductDetail route menerima sembarang productId", () => {
    it(
        "untuk setiap productId non-kosong, navigasi ke /product/:id merender ProductDetail tanpa crash",
        () => {
            fc.assert(
                fc.property(
                    // Generate arbitrary non-empty productId strings
                    fc.string({ minLength: 1 }),
                    (productId) => {
                        // Render ProductDetail inside a MemoryRouter with the generated productId
                        // useProduct is mocked to return loading state — component renders LoadingSpinner
                        let caughtError = null;

                        try {
                            const { container, unmount } = render(
                                <MemoryRouter initialEntries={[`/product/${encodeURIComponent(productId)}`]}>
                                    <Routes>
                                        <Route path="/product/:id" element={<ProductDetail />} />
                                    </Routes>
                                </MemoryRouter>
                            );

                            // Component must render something (not be empty)
                            expect(container.firstChild).not.toBeNull();

                            // In loading state, ProductDetail renders a LoadingSpinner (animate-spin)
                            const spinner = container.querySelector(".animate-spin");
                            expect(spinner).not.toBeNull();

                            unmount();
                        } catch (err) {
                            caughtError = err;
                        }

                        // The component must never throw/crash for any non-empty productId
                        expect(caughtError).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "ProductDetail route dengan productId apapun selalu merender elemen root tanpa exception",
        () => {
            fc.assert(
                fc.property(
                    // Generate a wider variety of productId strings including special chars
                    fc.string({ minLength: 1 }),
                    (productId) => {
                        let renderError = null;

                        try {
                            const { container, unmount } = render(
                                <MemoryRouter initialEntries={[`/product/${encodeURIComponent(productId)}`]}>
                                    <Routes>
                                        <Route path="/product/:id" element={<ProductDetail />} />
                                    </Routes>
                                </MemoryRouter>
                            );

                            // Container must have content — component did not crash
                            expect(container.innerHTML).not.toBe("");

                            unmount();
                        } catch (err) {
                            renderError = err;
                        }

                        expect(renderError).toBeNull();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Import Checkout page for Properties 3, 4, 5
// ---------------------------------------------------------------------------
import Checkout from "../../pages/Checkout";

// ---------------------------------------------------------------------------
// Helper: format price as Rupiah (same as Checkout.jsx formatRupiah)
// ---------------------------------------------------------------------------
function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
    }).format(amount);
}

// ---------------------------------------------------------------------------
// Helper: build a valid cart item with productId for Checkout rendering
// ---------------------------------------------------------------------------
function toCartItem(item, index) {
    return {
        productId: `product-${index}`,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: "",
    };
}

// ---------------------------------------------------------------------------
// Helper: render Checkout with given cart items and authenticated user
// ---------------------------------------------------------------------------
function renderCheckout(cartItems, user = { uid: "user-123", email: "test@example.com", displayName: "Test User" }) {
    const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
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

    mockUseAuth.mockReturnValue({
        user,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    });

    const result = render(
        <MemoryRouter initialEntries={["/checkout"]}>
            <Routes>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/" element={<div data-testid="home-page">Home</div>} />
            </Routes>
        </MemoryRouter>
    );

    return { ...result, totalAmount, clearCart };
}

// ---------------------------------------------------------------------------
// Property 3 — CheckoutForm menampilkan semua field cart items
// **Validates: Requirements 6.1**
// ---------------------------------------------------------------------------

describe("Property 3: CheckoutForm menampilkan semua field cart items", () => {
    it(
        "untuk setiap daftar cart items, OrderSummary menampilkan nama, kuantitas, harga satuan, dan total harga setiap item",
        () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1 }),
                            price: fc.float({ min: 1000, max: 10_000_000, noNaN: true }),
                            quantity: fc.integer({ min: 1, max: 99 }),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (rawItems) => {
                        const cartItems = rawItems.map(toCartItem);
                        const { container, unmount } = renderCheckout(cartItems);

                        // OrderSummary renders inside <section aria-label="Ringkasan belanja">
                        const summarySection = container.querySelector(
                            'section[aria-label="Ringkasan belanja"]'
                        );
                        expect(summarySection).not.toBeNull();

                        // Each item is rendered as a <li> inside <ul role="list">
                        const listItems = summarySection.querySelectorAll('ul[role="list"] li');
                        expect(listItems.length).toBe(cartItems.length);

                        listItems.forEach((li, index) => {
                            const item = cartItems[index];

                            // 1. Item name must be displayed
                            const nameEl = li.querySelector("p.font-medium");
                            expect(nameEl).not.toBeNull();
                            expect(nameEl.textContent).toBe(item.name);

                            // 2. Unit price × quantity must be displayed (e.g. "Rp 10.000 × 2")
                            const priceQtyEl = li.querySelector("p.text-xs");
                            expect(priceQtyEl).not.toBeNull();
                            const priceQtyText = priceQtyEl.textContent;
                            expect(priceQtyText).toContain(formatRupiah(item.price));
                            expect(priceQtyText).toContain(`× ${item.quantity}`);

                            // 3. Subtotal (price * quantity) must be displayed
                            const subtotalEl = li.querySelector("p.font-semibold");
                            expect(subtotalEl).not.toBeNull();
                            expect(subtotalEl.textContent).toBe(
                                formatRupiah(item.price * item.quantity)
                            );
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "total harga yang ditampilkan selalu sama dengan sum(price * quantity) dari semua cart items",
        () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1 }),
                            price: fc.float({ min: 1000, max: 10_000_000, noNaN: true }),
                            quantity: fc.integer({ min: 1, max: 99 }),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (rawItems) => {
                        const cartItems = rawItems.map(toCartItem);
                        const { container, totalAmount, unmount } = renderCheckout(cartItems);

                        // The total is displayed in the summary section
                        const summarySection = container.querySelector(
                            'section[aria-label="Ringkasan belanja"]'
                        );
                        expect(summarySection).not.toBeNull();

                        // Total is in a span with text-xl font-bold
                        const totalEl = summarySection.querySelector("span.text-xl");
                        expect(totalEl).not.toBeNull();
                        expect(totalEl.textContent).toBe(formatRupiah(totalAmount));

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 4 — Order document memiliki semua required fields
// **Validates: Requirements 6.2**
// ---------------------------------------------------------------------------

describe("Property 4: Order document memiliki semua required fields", () => {
    it(
        "untuk setiap daftar cart items yang di-submit, dokumen order mengandung userId, items, totalAmount, status: 'pending', dan timestamp",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1 }),
                            price: fc.float({ min: 1000, max: 10_000_000, noNaN: true }),
                            quantity: fc.integer({ min: 1, max: 99 }),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    fc.record({
                        uid: fc.string({ minLength: 1, maxLength: 28 }),
                        email: fc.emailAddress(),
                        displayName: fc.string({ minLength: 1 }),
                    }),
                    async (rawItems, user) => {
                        mockAddDoc.mockResolvedValueOnce({ id: "mock-order-id" });

                        const cartItems = rawItems.map(toCartItem);
                        const { container, totalAmount, unmount } = renderCheckout(cartItems, user);

                        // Fill in all required shipping form fields with valid data
                        const nameInput = container.querySelector("#name");
                        const phoneInput = container.querySelector("#phone");
                        const addressInput = container.querySelector("#address");
                        const cityInput = container.querySelector("#city");
                        const postalCodeInput = container.querySelector("#postalCode");

                        fireEvent.change(nameInput, { target: { value: "Budi Santoso" } });
                        fireEvent.change(phoneInput, { target: { value: "08123456789" } });
                        fireEvent.change(addressInput, { target: { value: "Jl. Merdeka No. 1" } });
                        fireEvent.change(cityInput, { target: { value: "Jakarta" } });
                        fireEvent.change(postalCodeInput, { target: { value: "12345" } });

                        // Submit the form
                        const form = container.querySelector("form");
                        expect(form).not.toBeNull();
                        fireEvent.submit(form);

                        // Wait for addDoc to be called
                        await waitFor(() => {
                            expect(mockAddDoc).toHaveBeenCalled();
                        });

                        // Inspect the document passed to addDoc
                        const [, orderDoc] = mockAddDoc.mock.calls[mockAddDoc.mock.calls.length - 1];

                        // Required field: userId
                        expect(orderDoc).toHaveProperty("userId");
                        expect(orderDoc.userId).toBe(user.uid);

                        // Required field: items (array matching cart items)
                        expect(orderDoc).toHaveProperty("items");
                        expect(Array.isArray(orderDoc.items)).toBe(true);
                        expect(orderDoc.items.length).toBe(cartItems.length);

                        // Each item in the order must have productId, name, price, quantity
                        orderDoc.items.forEach((orderItem, index) => {
                            expect(orderItem).toHaveProperty("productId");
                            expect(orderItem).toHaveProperty("name");
                            expect(orderItem).toHaveProperty("price");
                            expect(orderItem).toHaveProperty("quantity");
                            expect(orderItem.name).toBe(cartItems[index].name);
                            expect(orderItem.price).toBe(cartItems[index].price);
                            expect(orderItem.quantity).toBe(cartItems[index].quantity);
                        });

                        // Required field: totalAmount
                        expect(orderDoc).toHaveProperty("totalAmount");
                        expect(orderDoc.totalAmount).toBeCloseTo(totalAmount, 5);

                        // Required field: status = 'pending'
                        expect(orderDoc).toHaveProperty("status");
                        expect(orderDoc.status).toBe("pending");

                        // Required field: timestamp (serverTimestamp was called)
                        expect(orderDoc).toHaveProperty("timestamp");

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        },
        30_000
    );
});

// ---------------------------------------------------------------------------
// Property 5 — Checkout error tidak menghilangkan cart data
// **Validates: Requirements 6.4**
// ---------------------------------------------------------------------------

describe("Property 5: Checkout error tidak menghilangkan cart data", () => {
    it(
        "ketika Firestore addDoc gagal, cart items dan total tetap ditampilkan tanpa perubahan",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1 }),
                            price: fc.float({ min: 1000, max: 10_000_000, noNaN: true }),
                            quantity: fc.integer({ min: 1, max: 99 }),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    async (rawItems) => {
                        // Mock Firestore to throw an error
                        mockAddDoc.mockRejectedValueOnce(new Error("Firestore unavailable"));

                        const cartItems = rawItems.map(toCartItem);
                        const { container, totalAmount, clearCart, unmount } =
                            renderCheckout(cartItems);

                        // Fill in all required shipping form fields
                        fireEvent.change(container.querySelector("#name"), {
                            target: { value: "Budi Santoso" },
                        });
                        fireEvent.change(container.querySelector("#phone"), {
                            target: { value: "08123456789" },
                        });
                        fireEvent.change(container.querySelector("#address"), {
                            target: { value: "Jl. Merdeka No. 1" },
                        });
                        fireEvent.change(container.querySelector("#city"), {
                            target: { value: "Jakarta" },
                        });
                        fireEvent.change(container.querySelector("#postalCode"), {
                            target: { value: "12345" },
                        });

                        // Submit the form — this will trigger the Firestore error
                        const form = container.querySelector("form");
                        expect(form).not.toBeNull();
                        fireEvent.submit(form);

                        // Wait for the error mesocean to appear
                        await waitFor(() => {
                            const alertEl = container.querySelector("[role='alert']");
                            expect(alertEl).not.toBeNull();
                            expect(alertEl.textContent.trim().length).toBeGreaterThan(0);
                        });

                        // After error: cart items must still be displayed in OrderSummary
                        const summarySection = container.querySelector(
                            'section[aria-label="Ringkasan belanja"]'
                        );
                        expect(summarySection).not.toBeNull();

                        const listItems = summarySection.querySelectorAll('ul[role="list"] li');
                        expect(listItems.length).toBe(cartItems.length);

                        // Each item must still show its name
                        listItems.forEach((li, index) => {
                            const nameEl = li.querySelector("p.font-medium");
                            expect(nameEl).not.toBeNull();
                            expect(nameEl.textContent).toBe(cartItems[index].name);
                        });

                        // Total must still be displayed correctly
                        const totalEl = summarySection.querySelector("span.text-xl");
                        expect(totalEl).not.toBeNull();
                        expect(totalEl.textContent).toBe(formatRupiah(totalAmount));

                        // clearCart must NOT have been called (cart data preserved)
                        expect(clearCart).not.toHaveBeenCalled();

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        },
        30_000
    );

    it(
        "setelah Firestore error, pesan error deskriptif ditampilkan kepada user",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            name: fc.string({ minLength: 1 }),
                            price: fc.float({ min: 1000, max: 10_000_000, noNaN: true }),
                            quantity: fc.integer({ min: 1, max: 99 }),
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (rawItems) => {
                        mockAddDoc.mockRejectedValueOnce(new Error("Network error"));

                        const cartItems = rawItems.map(toCartItem);
                        const { container, unmount } = renderCheckout(cartItems);

                        // Fill in all required shipping form fields
                        fireEvent.change(container.querySelector("#name"), {
                            target: { value: "Siti Rahayu" },
                        });
                        fireEvent.change(container.querySelector("#phone"), {
                            target: { value: "08987654321" },
                        });
                        fireEvent.change(container.querySelector("#address"), {
                            target: { value: "Jl. Sudirman No. 5" },
                        });
                        fireEvent.change(container.querySelector("#city"), {
                            target: { value: "Bandung" },
                        });
                        fireEvent.change(container.querySelector("#postalCode"), {
                            target: { value: "40111" },
                        });

                        const form = container.querySelector("form");
                        fireEvent.submit(form);

                        // Error mesocean must appear
                        await waitFor(() => {
                            const alertEl = container.querySelector("[role='alert']");
                            expect(alertEl).not.toBeNull();
                            // Error mesocean must be descriptive (non-empty)
                            expect(alertEl.textContent.trim().length).toBeGreaterThan(10);
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        },
        30_000
    );
});
