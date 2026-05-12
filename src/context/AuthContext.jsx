import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
    signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../services/firebase";

const AuthContext = createContext(null);

/**
 * Maps Firebase Auth error codes to Indonesian language mesoceans.
 * @param {string} code - Firebase error code
 * @returns {string} User-friendly error mesocean in Indonesian
 */
function mapFirebaseError(code) {
    const errorMap = {
        "auth/wrong-password": "Email atau password salah.",
        "auth/user-not-found": "Akun tidak ditemukan.",
        "auth/email-already-in-use": "Email sudah digunakan.",
        "auth/weak-password": "Password terlalu lemah, minimal 6 karakter.",
        "auth/invalid-email": "Format email tidak valid.",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
        "auth/invalid-credential": "Email atau password salah.",
        "auth/requires-recent-login": "Sesi kamu sudah lama. Silakan login ulang untuk mengubah password.",
    };
    return errorMap[code] ?? "Terjadi kesalahan. Silakan coba lagi.";
}

/**
 * AuthProvider wraps the app and provides Firebase Auth state globally.
 * Exposes: { user, loading, signIn, signUp, signOut }
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    /**
     * Sign in with email and password.
     * Throws an error with an Indonesian mesocean on failure.
     */
    async function signIn(email, password) {
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            return credential;
        } catch (error) {
            throw new Error(mapFirebaseError(error.code));
        }
    }

    /**
     * Register a new user with email, password, and display name.
     * Throws an error with an Indonesian mesocean on failure.
     */
    async function signUp(email, password, displayName) {
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName });
            // Update local user state to reflect the new displayName immediately
            setUser({ ...credential.user, displayName });
            return credential;
        } catch (error) {
            throw new Error(mapFirebaseError(error.code));
        }
    }

    /**
     * Sign out the current user.
     * Throws an error with an Indonesian mesocean on failure.
     */
    async function signOut() {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            throw new Error(mapFirebaseError(error.code));
        }
    }

    /** Send password reset email. */
    async function sendPasswordReset(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            throw new Error(mapFirebaseError(error.code));
        }
    }

    /**
     * Change password — requires re-authentication with current password first.
     * @param {string} currentPassword
     * @param {string} newPassword
     */
    async function changePassword(currentPassword, newPassword) {
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
        } catch (error) {
            throw new Error(mapFirebaseError(error.code));
        }
    }

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        changePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
export default AuthContext;
