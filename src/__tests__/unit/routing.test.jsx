/**
 * Unit tests for application routing (App.jsx)
 *
 * Validates:
 *   - Requirement 3.1: route `/` renders Home
 *   - Requirement 3.2: route `/product/:id` renders ProductDetail
 *   - Requirement 3.3: route `/cart` renders Cart
 *   - Requirement 3.4: route `/checkout` is a ProtectedRoute (guest → redirect /login)
 *   - Requirement 3.5: route `/login` renders Login
 *   - Requirement 3.6: route `/register` renders Register
 *   - Requirement 3.7: GuestUser accessing /checkout is redirected to /login
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// ── Mock Firebase so no real SDK calls are made ───────────────────────────────

vi.mock('../../services/firebase', () => ({
    auth: {},
    db: {},
}));

vi.mock('firebase/auth', () => ({
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
    signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    addDoc: vi.fn(),
    orderBy: vi.fn(),
}));

// ── Mock assets ───────────────────────────────────────────────────────────────

vi.mock('../../assets/hero.png', () => ({ default: 'hero.png' }));

// ── Mock page components with identifiable test IDs ───────────────────────────

vi.mock('../../pages/Home', () => ({
    default: () => <div data-testid="page-home">Home Page</div>,
}));

vi.mock('../../pages/ProductDetail', () => ({
    default: () => <div data-testid="page-product-detail">ProductDetail Page</div>,
}));

vi.mock('../../pages/Cart', () => ({
    default: () => <div data-testid="page-cart">Cart Page</div>,
}));

vi.mock('../../pages/Checkout', () => ({
    default: () => <div data-testid="page-checkout">Checkout Page</div>,
}));

vi.mock('../../pages/Login', () => ({
    default: () => <div data-testid="page-login">Login Page</div>,
}));

vi.mock('../../pages/Register', () => ({
    default: () => <div data-testid="page-register">Register Page</div>,
}));

// ── Mock Navbar and LoadingSpinner ────────────────────────────────────────────

vi.mock('../../components/Navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('../../components/LoadingSpinner', () => ({
    default: () => <div data-testid="loading-spinner">Loading…</div>,
}));

// ── Top-level imports (resolved after mocks are hoisted) ──────────────────────

import Home from '../../pages/Home';
import ProductDetail from '../../pages/ProductDetail';
import Cart from '../../pages/Cart';
import Checkout from '../../pages/Checkout';
import Login from '../../pages/Login';
import Register from '../../pages/Register';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';
import ProtectedRoute from '../../components/ProtectedRoute';

// ── Shared context values ─────────────────────────────────────────────────────

const cartContextValue = {
    items: [],
    totalItems: 0,
    totalAmount: 0,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
};

/**
 * Render a route inside MemoryRouter with all required providers.
 * @param {string} initialPath - The URL to start at
 * @param {{ user?: object|null, loading?: boolean }} authState
 */
function renderRoute(initialPath, { user = null, loading = false } = {}) {
    const authContextValue = {
        user,
        loading,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
    };

    return render(
        <HelmetProvider>
            <AuthContext.Provider value={authContextValue}>
                <CartContext.Provider value={cartContextValue}>
                    <MemoryRouter initialEntries={[initialPath]}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/product/:id" element={<ProductDetail />} />
                            <Route path="/cart" element={<Cart />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route
                                path="/checkout"
                                element={
                                    <ProtectedRoute>
                                        <Checkout />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </MemoryRouter>
                </CartContext.Provider>
            </AuthContext.Provider>
        </HelmetProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Application routing', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
    });

    it('route `/` merender komponen Home (Requirement 3.1)', () => {
        renderRoute('/');
        expect(screen.getByTestId('page-home')).toBeInTheDocument();
    });

    it('route `/product/:id` merender komponen ProductDetail (Requirement 3.2)', () => {
        renderRoute('/product/abc-123');
        expect(screen.getByTestId('page-product-detail')).toBeInTheDocument();
    });

    it('route `/cart` merender komponen Cart (Requirement 3.3)', () => {
        renderRoute('/cart');
        expect(screen.getByTestId('page-cart')).toBeInTheDocument();
    });

    it('route `/login` merender komponen Login (Requirement 3.5)', () => {
        renderRoute('/login');
        expect(screen.getByTestId('page-login')).toBeInTheDocument();
    });

    it('route `/register` merender komponen Register (Requirement 3.6)', () => {
        renderRoute('/register');
        expect(screen.getByTestId('page-register')).toBeInTheDocument();
    });

    describe('route `/checkout` — ProtectedRoute (Requirements 3.4, 3.7)', () => {
        it('guest user diredirect ke /login', () => {
            // user = null → ProtectedRoute should redirect to /login
            renderRoute('/checkout', { user: null, loading: false });
            expect(screen.getByTestId('page-login')).toBeInTheDocument();
            expect(screen.queryByTestId('page-checkout')).not.toBeInTheDocument();
        });

        it('authenticated user dapat mengakses /checkout', () => {
            const mockUser = { uid: 'user-1', displayName: 'Budi' };
            renderRoute('/checkout', { user: mockUser, loading: false });
            expect(screen.getByTestId('page-checkout')).toBeInTheDocument();
            expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
        });

        it('menampilkan loading spinner saat auth masih loading', () => {
            renderRoute('/checkout', { user: null, loading: true });
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
            expect(screen.queryByTestId('page-checkout')).not.toBeInTheDocument();
            expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
        });
    });
});
