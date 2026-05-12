/**
 * Unit tests for Home page SEO meta tags
 * Validates: Requirements 8.2
 *
 * Tests that the Home page's SEOHelmet renders meta keywords and description
 * containing "susu kambing etawa".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

// ── Mock hooks that depend on Firebase ──────────────────────────────────────

vi.mock('../../hooks/useProduct', () => ({
    useProducts: () => ({ products: [], loading: false, error: null }),
}));

vi.mock('../../hooks/useCart', () => ({
    useCart: () => ({ addItem: vi.fn() }),
}));

// ── Mock react-router-dom (Navbar uses Link) ─────────────────────────────────

vi.mock('react-router-dom', () => ({
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
}));

// ── Mock assets ───────────────────────────────────────────────────────────────

vi.mock('../../assets/hero.png', () => ({ default: 'hero.png' }));

// ── Import component under test ───────────────────────────────────────────────

import Home from '../../pages/Home';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderHome() {
    document.head.innerHTML = '';
    return render(
        <HelmetProvider>
            <Home />
        </HelmetProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Home page SEO meta tags', () => {
    beforeEach(() => {
        document.head.innerHTML = '';
    });

    it('meta keywords mengandung "susu kambing etawa"', () => {
        renderHome();

        const metaKeywords = document.querySelector('meta[name="keywords"]');
        expect(metaKeywords).not.toBeNull();
        expect(metaKeywords.getAttribute('content')).toContain('susu kambing etawa');
    });

    it('meta description mengandung "susu kambing etawa"', () => {
        renderHome();

        const metaDescription = document.querySelector('meta[name="description"]');
        expect(metaDescription).not.toBeNull();
        expect(metaDescription.getAttribute('content')).toContain('susu kambing etawa');
    });
});
