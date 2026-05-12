// Feature: giarva-ecommerce, Property 12: LazyImage selalu menampilkan fallback saat gambar gagal dimuat
// Feature: giarva-ecommerce, Property 10: SEOHelmet selalu menghasilkan meta tags yang lengkap
// Feature: giarva-ecommerce, Property 11: ProductDetail SEO mengandung nama produk

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import * as fc from "fast-check";
import LazyImage from "../../components/LazyImage";
import SEOHelmet from "../../components/SEOHelmet";
import { HelmetProvider } from "react-helmet-async";

// ---------------------------------------------------------------------------
// Mock IntersectionObserver so the component immediately enters 'loading' state
// ---------------------------------------------------------------------------

let intersectionCallback = null;

function MockIntersectionObserver(callback) {
    intersectionCallback = callback;
    return {
        observe: (element) => {
            // Immediately simulate the element entering the viewport
            callback([{ isIntersecting: true, target: element }]);
        },
        disconnect: () => { },
        unobserve: () => { },
    };
}

beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
    intersectionCallback = null;
});

// ---------------------------------------------------------------------------
// Property 12 — LazyImage selalu menampilkan fallback saat gambar gagal dimuat
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------

describe("Property 12: LazyImage selalu menampilkan fallback saat gambar gagal dimuat", () => {
    it(
        "untuk setiap URL gambar yang gagal dimuat, LazyImage menampilkan fallback atau alt text — tidak pernah broken image tanpa fallback",
        () => {
            fc.assert(
                fc.property(
                    // Generate invalid/arbitrary src URLs
                    fc.string(),
                    // Generate alt text
                    fc.string({ minLength: 1, maxLength: 50 }),
                    // Optionally generate a fallback URL (or undefined)
                    fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
                    (invalidSrc, altText, fallbackSrc) => {
                        const { container, unmount } = render(
                            <LazyImage
                                src={invalidSrc}
                                alt={altText}
                                fallbackSrc={fallbackSrc}
                            />
                        );

                        // Find the hidden img element rendered during 'loading' state
                        // (it has opacity-0 class while loading)
                        const loadingImg = container.querySelector("img");

                        // The component should be in 'loading' state now (IntersectionObserver fired)
                        // Simulate image load error
                        if (loadingImg) {
                            fireEvent.error(loadingImg);
                        }

                        // After error, verify fallback behavior
                        if (fallbackSrc) {
                            // Should render a fallback <img> with fallbackSrc
                            const fallbackImg = container.querySelector("img");
                            expect(fallbackImg).not.toBeNull();
                            // Use getAttribute to get the raw src value (jsdom resolves .src to absolute URL)
                            expect(fallbackImg.getAttribute("src")).toBe(fallbackSrc);
                        } else {
                            // Should render a placeholder div with aria-label and role="img"
                            // (no broken <img> without fallback)
                            const imgs = container.querySelectorAll("img");
                            const placeholderDiv = container.querySelector('[role="img"]');

                            // Either there's no img at all, or there's a fallback img
                            // The key invariant: if there's an img, it must have a valid src (fallbackSrc)
                            // Since fallbackSrc is undefined here, there should be NO img element
                            expect(imgs).toHaveLength(0);
                            // There should be a placeholder with aria-label
                            expect(placeholderDiv).not.toBeNull();
                            expect(placeholderDiv.getAttribute("aria-label")).toBe(altText);
                        }

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "LazyImage dengan fallbackSrc selalu menampilkan gambar fallback saat error",
        () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (invalidSrc, altText, fallbackSrc) => {
                        const { container, unmount } = render(
                            <LazyImage
                                src={invalidSrc}
                                alt={altText}
                                fallbackSrc={fallbackSrc}
                            />
                        );

                        const loadingImg = container.querySelector("img");
                        if (loadingImg) {
                            fireEvent.error(loadingImg);
                        }

                        // After error with fallbackSrc, must show fallback img
                        const fallbackImg = container.querySelector("img");
                        expect(fallbackImg).not.toBeNull();
                        expect(fallbackImg.getAttribute("alt")).toBe(altText);

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "LazyImage tanpa fallbackSrc tidak pernah menampilkan broken image saat error",
        () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    (invalidSrc, altText) => {
                        const { container, unmount } = render(
                            <LazyImage
                                src={invalidSrc}
                                alt={altText}
                            // No fallbackSrc
                            />
                        );

                        const loadingImg = container.querySelector("img");
                        if (loadingImg) {
                            fireEvent.error(loadingImg);
                        }

                        // After error without fallbackSrc:
                        // - No <img> element should remain (no broken image)
                        // - A placeholder div with role="img" and aria-label should be present
                        const imgs = container.querySelectorAll("img");
                        expect(imgs).toHaveLength(0);

                        const placeholder = container.querySelector('[role="img"]');
                        expect(placeholder).not.toBeNull();
                        expect(placeholder.getAttribute("aria-label")).toBe(altText);

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 10 — SEOHelmet selalu menghasilkan meta tags yang lengkap
// **Validates: Requirements 8.1, 8.4**
// ---------------------------------------------------------------------------

describe("Property 10: SEOHelmet selalu menghasilkan meta tags yang lengkap", () => {
    it(
        "untuk setiap kombinasi title, description, keywords, dan ogImage, SEOHelmet menghasilkan semua meta tags yang diperlukan",
        () => {
            fc.assert(
                fc.property(
                    fc.record({
                        title: fc.string({ minLength: 1 }),
                        description: fc.string({ minLength: 1 }),
                        // Use non-empty strings so keywords and ogImage are always truthy
                        keywords: fc.string({ minLength: 1 }),
                        ogImage: fc.string({ minLength: 1 }),
                    }),
                    (seoProps) => {
                        // Clean up document.head before each render to avoid stale tags
                        document.head.innerHTML = "";

                        const { unmount } = render(
                            <HelmetProvider>
                                <SEOHelmet
                                    title={seoProps.title}
                                    description={seoProps.description}
                                    keywords={seoProps.keywords}
                                    ogImage={seoProps.ogImage}
                                />
                            </HelmetProvider>
                        );

                        // React 19 hoists <title> and <meta> elements to document.head

                        // 1. Title tag must be present and match prop
                        const titleElement = document.querySelector("title");
                        expect(titleElement).not.toBeNull();
                        expect(titleElement.textContent).toBe(seoProps.title);

                        // 2. Meta description must be present
                        const metaDescription = document.querySelector('meta[name="description"]');
                        expect(metaDescription).not.toBeNull();
                        expect(metaDescription.getAttribute("content")).toBe(seoProps.description);

                        // 3. Meta keywords must be present (keywords is non-empty, so truthy)
                        const metaKeywords = document.querySelector('meta[name="keywords"]');
                        expect(metaKeywords).not.toBeNull();
                        expect(metaKeywords.getAttribute("content")).toBe(seoProps.keywords);

                        // 4. Open Graph title must be present
                        const ogTitle = document.querySelector('meta[property="og:title"]');
                        expect(ogTitle).not.toBeNull();
                        expect(ogTitle.getAttribute("content")).toBe(seoProps.title);

                        // 5. Open Graph description must be present
                        const ogDescription = document.querySelector('meta[property="og:description"]');
                        expect(ogDescription).not.toBeNull();
                        expect(ogDescription.getAttribute("content")).toBe(seoProps.description);

                        // 6. Open Graph image must be present (ogImage is non-empty, so truthy)
                        const ogImageTag = document.querySelector('meta[property="og:image"]');
                        expect(ogImageTag).not.toBeNull();
                        expect(ogImageTag.getAttribute("content")).toBe(seoProps.ogImage);

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "SEOHelmet dengan keywords dan ogImage kosong tetap menghasilkan meta tags title, description, og:title, og:description",
        () => {
            fc.assert(
                fc.property(
                    fc.record({
                        title: fc.string({ minLength: 1 }),
                        description: fc.string({ minLength: 1 }),
                    }),
                    (seoProps) => {
                        // Clean up document.head before each render to avoid stale tags
                        document.head.innerHTML = "";

                        const { unmount } = render(
                            <HelmetProvider>
                                <SEOHelmet
                                    title={seoProps.title}
                                    description={seoProps.description}
                                // keywords and ogImage not provided
                                />
                            </HelmetProvider>
                        );

                        // Title must be present
                        const titleElement = document.querySelector("title");
                        expect(titleElement).not.toBeNull();
                        expect(titleElement.textContent).toBe(seoProps.title);

                        // meta description must be present
                        const metaDescription = document.querySelector('meta[name="description"]');
                        expect(metaDescription).not.toBeNull();
                        expect(metaDescription.getAttribute("content")).toBe(seoProps.description);

                        // og:title must be present
                        const ogTitle = document.querySelector('meta[property="og:title"]');
                        expect(ogTitle).not.toBeNull();
                        expect(ogTitle.getAttribute("content")).toBe(seoProps.title);

                        // og:description must be present
                        const ogDescription = document.querySelector('meta[property="og:description"]');
                        expect(ogDescription).not.toBeNull();
                        expect(ogDescription.getAttribute("content")).toBe(seoProps.description);

                        // keywords should NOT be present when not provided
                        const metaKeywords = document.querySelector('meta[name="keywords"]');
                        expect(metaKeywords).toBeNull();

                        // og:image should NOT be present when not provided
                        const ogImageTag = document.querySelector('meta[property="og:image"]');
                        expect(ogImageTag).toBeNull();

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 11 — ProductDetail SEO mengandung nama produk
// **Validates: Requirements 8.3**
// ---------------------------------------------------------------------------

describe("Property 11: ProductDetail SEO mengandung nama produk", () => {
    it(
        "untuk setiap nama produk, SEOHelmet di halaman ProductDetail selalu mengandung nama produk di title dan description",
        () => {
            fc.assert(
                fc.property(
                    // Generate any non-empty product name
                    fc.string({ minLength: 1 }),
                    (productName) => {
                        // Clean up document.head before each render to avoid stale tags
                        document.head.innerHTML = "";

                        // Replicate the exact props ProductDetail passes to SEOHelmet:
                        //   title={`${name} — Giarva`}
                        //   description={seoDescription} — which contains productName
                        const title = `${productName} — Giarva`;
                        const description = `Beli ${productName} dari Giarva. Susu kambing etawa premium berkualitas tinggi.`;

                        const { unmount } = render(
                            <HelmetProvider>
                                <SEOHelmet
                                    title={title}
                                    description={description}
                                />
                            </HelmetProvider>
                        );

                        // 1. Title must contain the product name
                        const titleElement = document.querySelector("title");
                        expect(titleElement).not.toBeNull();
                        expect(titleElement.textContent).toContain(productName);

                        // 2. Meta description must contain the product name
                        const metaDescription = document.querySelector('meta[name="description"]');
                        expect(metaDescription).not.toBeNull();
                        expect(metaDescription.getAttribute("content")).toContain(productName);

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "title SEOHelmet ProductDetail selalu menggunakan format '{productName} — Giarva'",
        () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1 }),
                    (productName) => {
                        document.head.innerHTML = "";

                        const title = `${productName} — Giarva`;
                        const description = `Beli ${productName} dari Giarva. Susu kambing etawa premium berkualitas tinggi.`;

                        const { unmount } = render(
                            <HelmetProvider>
                                <SEOHelmet
                                    title={title}
                                    description={description}
                                />
                            </HelmetProvider>
                        );

                        // Title must follow the exact format used by ProductDetail
                        const titleElement = document.querySelector("title");
                        expect(titleElement).not.toBeNull();
                        expect(titleElement.textContent).toBe(`${productName} — Giarva`);

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});
