import { Navigate } from 'react-router-dom';
import { useAdminRole } from '../hooks/useAdminRole';
import LoadingSpinner from './LoadingSpinner';

/**
 * Wraps public/customer pages.
 * If the logged-in user is an admin, redirect them to /admin.
 */
export default function PublicRoute({ children }) {
    const { isAdmin, loading } = useAdminRole();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (isAdmin) return <Navigate to="/admin" replace />;
    return children;
}
