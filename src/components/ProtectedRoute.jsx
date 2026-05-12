import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";

/**
 * ProtectedRoute — guard route untuk user yang sudah terautentikasi.
 *
 * - Jika auth masih loading: tampilkan LoadingSpinner di tengah layar
 * - Jika user tidak authenticated (null): redirect ke /login dengan state { from: location }
 * - Jika user authenticated: render children
 *
 * @param {Object}    props
 * @param {ReactNode} props.children - Komponen yang dilindungi
 *
 * Requirements: 3.4, 3.7, 6.5
 */
export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (user === null) {
        return (
            <Navigate
                to="/login"
                state={{ from: location }}
                replace
            />
        );
    }

    return children;
}
