import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Custom hook to consume AuthContext.
 * Must be used inside an AuthProvider.
 *
 * @returns {{ user, loading, signIn, signUp, signOut }}
 */
export function useAuth() {
    const context = useContext(AuthContext);

    if (context === null) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

export default useAuth;
