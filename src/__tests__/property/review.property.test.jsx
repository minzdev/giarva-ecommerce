// Feature: giarva-ecommerce, Property 7: Rata-rata rating dihitung dengan benar
// Feature: giarva-ecommerce, Property 8: Setiap review ditampilkan dengan semua field yang diperlukan
// Feature: giarva-ecommerce, Property 9: Review dengan input tidak valid tidak dikirim ke Firestore

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";

// ---------------------------------------------------------------------------
// Mock Firebase SDK so tests run without real Firebase credentials
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

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({ type: "mock-db" })),
    collection: (...args) => mockCollection(...args),
    query: (...args) => mockQuery(...args),
    where: (...args) => mockWhere(...args),
    getDocs: (...args) => mockGetDocs(...args),
    addDoc: (...args) => mockAddDoc(...args),
    Timestamp: {
        now: () => ({ toDate: () => new Date() }),
    },
}));

// ---------------------------------------------------------------------------
// Mock useAuth hook
// ---------------------------------------------------------------------------
vi.mock("../../hooks/useAuth", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "../../hooks/useAuth";
import ReviewSystem from "../../components/ReviewSystem";

// ---------------------------------------------------------------------------
// Helper: build a mock Firestore snapshot from an array of review objects
// ---------------------------------------------------------------------------
function buildSnapshot(reviews) {
    return {
        docs: reviews.map((review, index) => ({
            id: `review-${index}`,
            data: () => review,
        })),
    };
}

// ---------------------------------------------------------------------------
// Helper: calculate expected average rating (same formula as ReviewSystem)
// ---------------------------------------------------------------------------
function expectedAverage(ratings) {
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
}

// ---------------------------------------------------------------------------
// Helper: compute initials the same way ReviewSystem's getInitials does
// ---------------------------------------------------------------------------
function getInitials(name) {
    if (!name || typeof name !== "string") return "?";
    const trimmed = name.trim();
    if (trimmed === "") return "?";
    return trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

// ---------------------------------------------------------------------------
// Arbitrary: valid Date (not Invalid Date) within a reasonable range
// Filter out NaN dates that fast-check may produce during shrinking
// ---------------------------------------------------------------------------
const validDateArb = fc
    .date({
        min: new Date("2000-01-01"),
        max: new Date("2030-12-31"),
    })
    .filter((d) => !isNaN(d.getTime()));

// ---------------------------------------------------------------------------
// Property 7 — Rata-rata rating dihitung dengan benar
// **Validates: Requirements 7.3**
// ---------------------------------------------------------------------------

describe("Property 7: Rata-rata rating dihitung dengan benar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCollection.mockReturnValue("mock-collection-ref");
        mockQuery.mockReturnValue("mock-query-ref");
        mockWhere.mockReturnValue("mock-where-ref");
        useAuth.mockReturnValue({ user: null });
    });

    it(
        "rata-rata rating yang ditampilkan selalu sama dengan sum(ratings) / count(reviews)",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1 }),
                    async (ratings) => {
                        // Build reviews from the generated ratings array
                        const reviews = ratings.map((rating, i) => ({
                            userName: `User${i}`,
                            rating,
                            comment: `Comment ${i}`,
                            timestamp: { toDate: () => new Date("2024-01-01") },
                        }));

                        mockGetDocs.mockResolvedValueOnce(buildSnapshot(reviews));

                        const { container, unmount } = render(
                            <ReviewSystem productId="product-123" />
                        );

                        // Wait for reviews to load
                        await waitFor(() => {
                            expect(mockGetDocs).toHaveBeenCalled();
                        });

                        // Calculate expected average
                        const avg = expectedAverage(ratings);
                        const expectedDisplay = avg.toFixed(1);

                        // The component renders averageRating.toFixed(1) in a <span>
                        await waitFor(() => {
                            const avgElement = container.querySelector(
                                "span.text-4xl"
                            );
                            expect(avgElement).not.toBeNull();
                            expect(avgElement.textContent).toBe(expectedDisplay);
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "rata-rata rating dengan satu review sama dengan rating review tersebut",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 5 }),
                    async (singleRating) => {
                        const reviews = [
                            {
                                userName: "SingleUser",
                                rating: singleRating,
                                comment: "Single comment",
                                timestamp: { toDate: () => new Date("2024-01-01") },
                            },
                        ];

                        mockGetDocs.mockResolvedValueOnce(buildSnapshot(reviews));

                        const { container, unmount } = render(
                            <ReviewSystem productId="product-single" />
                        );

                        await waitFor(() => {
                            const avgElement = container.querySelector("span.text-4xl");
                            expect(avgElement).not.toBeNull();
                            expect(avgElement.textContent).toBe(
                                singleRating.toFixed(1)
                            );
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 8 — Setiap review ditampilkan dengan semua field yang diperlukan
// **Validates: Requirements 7.4**
// ---------------------------------------------------------------------------

describe("Property 8: Setiap review ditampilkan dengan semua field yang diperlukan", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCollection.mockReturnValue("mock-collection-ref");
        mockQuery.mockReturnValue("mock-query-ref");
        mockWhere.mockReturnValue("mock-where-ref");
        useAuth.mockReturnValue({ user: null });
    });

    it(
        "setiap review yang dirender menampilkan inisial nama user, komentar, dan tanggal",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            userName: fc.string({ minLength: 1 }),
                            rating: fc.integer({ min: 1, max: 5 }),
                            comment: fc.string({ minLength: 1 }),
                            timestamp: validDateArb,
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    async (reviewData) => {
                        // Convert Date to Firestore-like Timestamp shape
                        const reviews = reviewData.map((r) => ({
                            ...r,
                            timestamp: { toDate: () => r.timestamp },
                        }));

                        mockGetDocs.mockResolvedValueOnce(buildSnapshot(reviews));

                        const { container, unmount } = render(
                            <ReviewSystem productId="product-456" />
                        );

                        // Wait for reviews to load and list to render
                        await waitFor(() => {
                            const reviewList = container.querySelector(
                                'ul[aria-label="Daftar ulasan"]'
                            );
                            expect(reviewList).not.toBeNull();
                            const items = reviewList.querySelectorAll("li");
                            expect(items.length).toBe(reviews.length);
                        });

                        const reviewList = container.querySelector(
                            'ul[aria-label="Daftar ulasan"]'
                        );
                        const listItems = reviewList.querySelectorAll("li");

                        // Each rendered review must contain the required fields
                        listItems.forEach((li, index) => {
                            const review = reviewData[index];

                            // 1. User initials (avatar div with aria-hidden)
                            const avatarDiv = li.querySelector("[aria-hidden='true']");
                            expect(avatarDiv).not.toBeNull();
                            // Initials should be non-empty (component returns "?" for empty names)
                            const initialsText = avatarDiv.textContent.trim();
                            expect(initialsText.length).toBeGreaterThan(0);

                            // 2. Comment text
                            const commentEl = li.querySelector("p.text-gray-700");
                            expect(commentEl).not.toBeNull();
                            expect(commentEl.textContent).toBe(review.comment);

                            // 3. Date (time element)
                            const timeEl = li.querySelector("time");
                            expect(timeEl).not.toBeNull();
                            // Date text should be non-empty
                            expect(timeEl.textContent.trim().length).toBeGreaterThan(0);

                            // 4. Star rating (span elements rendered by StarRating in display mode)
                            const starSpan = li.querySelector(
                                'span[role="img"]'
                            );
                            expect(starSpan).not.toBeNull();
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        },
        30_000
    );

    it(
        "inisial nama user yang ditampilkan konsisten dengan nama user di review",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            userName: fc.string({ minLength: 1 }),
                            rating: fc.integer({ min: 1, max: 5 }),
                            comment: fc.string({ minLength: 1 }),
                            timestamp: validDateArb,
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    async (reviewData) => {
                        const reviews = reviewData.map((r) => ({
                            ...r,
                            timestamp: { toDate: () => r.timestamp },
                        }));

                        mockGetDocs.mockResolvedValueOnce(buildSnapshot(reviews));

                        const { container, unmount } = render(
                            <ReviewSystem productId="product-789" />
                        );

                        await waitFor(() => {
                            const reviewList = container.querySelector(
                                'ul[aria-label="Daftar ulasan"]'
                            );
                            expect(reviewList).not.toBeNull();
                            const items = reviewList.querySelectorAll("li");
                            expect(items.length).toBe(reviews.length);
                        });

                        const reviewList = container.querySelector(
                            'ul[aria-label="Daftar ulasan"]'
                        );
                        const listItems = reviewList.querySelectorAll("li");

                        listItems.forEach((li, index) => {
                            const review = reviewData[index];
                            const avatarDiv = li.querySelector("[aria-hidden='true']");
                            expect(avatarDiv).not.toBeNull();

                            // Compute expected initials using same logic as component
                            const expectedInitials = getInitials(review.userName);
                            expect(avatarDiv.textContent.trim()).toBe(expectedInitials);
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});

// ---------------------------------------------------------------------------
// Property 9 — Review dengan input tidak valid tidak dikirim ke Firestore
// **Validates: Requirements 7.5**
// ---------------------------------------------------------------------------

describe("Property 9: Review dengan input tidak valid tidak dikirim ke Firestore", () => {
    const mockUser = {
        uid: "user-123",
        email: "test@example.com",
        displayName: "Test User",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockCollection.mockReturnValue("mock-collection-ref");
        mockQuery.mockReturnValue("mock-query-ref");
        mockWhere.mockReturnValue("mock-where-ref");
        // Default: return empty reviews list
        mockGetDocs.mockResolvedValue(buildSnapshot([]));
        mockAddDoc.mockResolvedValue({ id: "new-review-id" });
        // Authenticated user so the form is rendered
        useAuth.mockReturnValue({ user: mockUser });
    });

    it(
        "submit dengan rating = 0 tidak memanggil Firestore addDoc",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Valid comment, but invalid rating (0 — default state)
                    fc.string({ minLength: 1 }),
                    async (validComment) => {
                        const { container, unmount } = render(
                            <ReviewSystem productId="product-invalid" />
                        );

                        // Wait for initial load to complete
                        await waitFor(() => {
                            expect(mockGetDocs).toHaveBeenCalled();
                        });

                        // The form section is rendered for authenticated users
                        const form = container.querySelector("form");
                        expect(form).not.toBeNull();

                        // Fill in the comment textarea
                        const textarea = container.querySelector(
                            "textarea#review-comment"
                        );
                        expect(textarea).not.toBeNull();
                        fireEvent.change(textarea, {
                            target: { value: validComment },
                        });

                        // Do NOT set rating (stays at 0 — default state)
                        // Submit the form
                        fireEvent.submit(form);

                        // addDoc must NOT have been called
                        expect(mockAddDoc).not.toHaveBeenCalled();

                        // Validation error mesocean must be shown
                        await waitFor(() => {
                            const alertEl = container.querySelector("[role='alert']");
                            expect(alertEl).not.toBeNull();
                            expect(alertEl.textContent.trim().length).toBeGreaterThan(0);
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "submit dengan komentar kosong atau whitespace tidak memanggil Firestore addDoc",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Invalid comment: empty string or whitespace-only
                    fc.oneof(
                        fc.constant(""),
                        fc.string().filter((s) => s.trim() === "")
                    ),
                    // Valid rating (1-5)
                    fc.integer({ min: 1, max: 5 }),
                    async (invalidComment, validRating) => {
                        const { container, unmount } = render(
                            <ReviewSystem productId="product-invalid-comment" />
                        );

                        // Wait for initial load
                        await waitFor(() => {
                            expect(mockGetDocs).toHaveBeenCalled();
                        });

                        // The form section is rendered for authenticated users
                        const form = container.querySelector("form");
                        expect(form).not.toBeNull();

                        // Set a valid rating by clicking the appropriate star button
                        const formSection = container.querySelector("div.bg-gray-50");
                        expect(formSection).not.toBeNull();
                        const starButtons = formSection.querySelectorAll(
                            "button[aria-label]"
                        );

                        if (starButtons.length >= validRating) {
                            fireEvent.click(starButtons[validRating - 1]);
                        }

                        // Set the comment to invalid value
                        const textarea = container.querySelector(
                            "textarea#review-comment"
                        );
                        expect(textarea).not.toBeNull();
                        fireEvent.change(textarea, {
                            target: { value: invalidComment },
                        });

                        // Submit the form
                        fireEvent.submit(form);

                        // addDoc must NOT have been called
                        expect(mockAddDoc).not.toHaveBeenCalled();

                        // Validation error mesocean must be shown
                        await waitFor(() => {
                            const alertEl = container.querySelector("[role='alert']");
                            expect(alertEl).not.toBeNull();
                            expect(alertEl.textContent.trim().length).toBeGreaterThan(0);
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );

    it(
        "submit dengan rating = 0 DAN komentar kosong tidak memanggil Firestore addDoc",
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Both invalid: rating 0 and empty/whitespace comment
                    fc.oneof(
                        fc.constant(""),
                        fc.string().filter((s) => s.trim() === "")
                    ),
                    async (invalidComment) => {
                        const { container, unmount } = render(
                            <ReviewSystem productId="product-both-invalid" />
                        );

                        // Wait for initial load
                        await waitFor(() => {
                            expect(mockGetDocs).toHaveBeenCalled();
                        });

                        // The form section is rendered for authenticated users
                        const form = container.querySelector("form");
                        expect(form).not.toBeNull();

                        // Set invalid comment
                        const textarea = container.querySelector(
                            "textarea#review-comment"
                        );
                        expect(textarea).not.toBeNull();
                        fireEvent.change(textarea, {
                            target: { value: invalidComment },
                        });

                        // Rating stays at 0 (default)
                        // Submit the form
                        fireEvent.submit(form);

                        // addDoc must NOT have been called
                        expect(mockAddDoc).not.toHaveBeenCalled();

                        // Validation error must be shown
                        await waitFor(() => {
                            const alertEl = container.querySelector("[role='alert']");
                            expect(alertEl).not.toBeNull();
                        });

                        unmount();
                    }
                ),
                { numRuns: 100 }
            );
        }
    );
});
