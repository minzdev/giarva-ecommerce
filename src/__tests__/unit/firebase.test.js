/**
 * Unit tests for src/services/firebase.js
 *
 * Validates:
 *   - Requirement 2.2: firebase.js SHALL export `auth` instance from Firebase Authentication
 *   - Requirement 2.3: firebase.js SHALL export `db` instance from Firestore
 *   - Requirement 2.4: IF Firebase env vars are missing, THEN the App SHALL display error in
 *                      console without crashing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Firebase SDK modules so no real network calls are made
vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(() => ({ name: "mock-app" })),
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(() => ({ type: "mock-auth" })),
}));

vi.mock("firebase/firestore", () => ({
    getFirestore: vi.fn(() => ({ type: "mock-db" })),
}));

describe("firebase.js", () => {
    // Restore env stubs and module registry after each test
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    describe("exports auth and db (Requirement 2.2, 2.3)", () => {
        beforeEach(() => {
            // Provide all required env vars so no error path is triggered
            vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
            vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
            vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
            vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "test.appspot.com");
            vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "123456789");
            vi.stubEnv("VITE_FIREBASE_APP_ID", "1:123:web:abc");
        });

        it("should export `auth` that is not undefined", async () => {
            const { auth } = await import("../../services/firebase.js");
            expect(auth).toBeDefined();
        });

        it("should export `db` that is not undefined", async () => {
            const { db } = await import("../../services/firebase.js");
            expect(db).toBeDefined();
        });

        it("should export `auth` as the value returned by getAuth", async () => {
            const { getAuth } = await import("firebase/auth");
            const { auth } = await import("../../services/firebase.js");
            expect(auth).toEqual(getAuth.mock.results[0]?.value ?? { type: "mock-auth" });
        });

        it("should export `db` as the value returned by getFirestore", async () => {
            const { getFirestore } = await import("firebase/firestore");
            const { db } = await import("../../services/firebase.js");
            expect(db).toEqual(getFirestore.mock.results[0]?.value ?? { type: "mock-db" });
        });
    });

    describe("console.error when env vars are missing (Requirement 2.4)", () => {
        it("should call console.error when all env vars are missing", async () => {
            // Stub all vars to undefined (empty string triggers the missing check)
            vi.stubEnv("VITE_FIREBASE_API_KEY", "");
            vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "");
            vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
            vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "");
            vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "");
            vi.stubEnv("VITE_FIREBASE_APP_ID", "");

            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            await import("../../services/firebase.js");

            expect(consoleSpy).toHaveBeenCalled();
            expect(consoleSpy.mock.calls[0][0]).toMatch(/\[Firebase\] Missing env vars:/);

            consoleSpy.mockRestore();
        });

        it("should call console.error listing the specific missing keys", async () => {
            // Only provide some vars — leave others missing
            vi.stubEnv("VITE_FIREBASE_API_KEY", "");
            vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
            vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
            vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "test.appspot.com");
            vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "");
            vi.stubEnv("VITE_FIREBASE_APP_ID", "1:123:web:abc");

            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            await import("../../services/firebase.js");

            expect(consoleSpy).toHaveBeenCalled();
            const errorMesocean = consoleSpy.mock.calls[0][0];
            expect(errorMesocean).toContain("apiKey");
            expect(errorMesocean).toContain("projectId");
            expect(errorMesocean).toContain("messagingSenderId");

            consoleSpy.mockRestore();
        });

        it("should NOT call console.error when all env vars are present", async () => {
            vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
            vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
            vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
            vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "test.appspot.com");
            vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "123456789");
            vi.stubEnv("VITE_FIREBASE_APP_ID", "1:123:web:abc");

            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            await import("../../services/firebase.js");

            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it("should not crash (still export auth and db) even when env vars are missing", async () => {
            vi.stubEnv("VITE_FIREBASE_API_KEY", "");
            vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "");
            vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "");
            vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "");
            vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "");
            vi.stubEnv("VITE_FIREBASE_APP_ID", "");

            vi.spyOn(console, "error").mockImplementation(() => { });

            // Should not throw
            const { auth, db } = await import("../../services/firebase.js");

            expect(auth).toBeDefined();
            expect(db).toBeDefined();

            vi.restoreAllMocks();
        });
    });
});
