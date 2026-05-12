import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

/**
 * CustomerRoute — blocks admin users from accessing public/customer routes.
 * If an admin tries to access any public route, they are redirected to /admin.
 * Regular users and guests pass through normally.
 */
export default function CustomerRoute({ children }) {
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState('checking'); // 'checking' | 'allowed' | 'redirect-admin'

    useEffect(() => {
        if (authLoading) return;

        // Guest — always allowed
        if (!user) { setStatus('allowed'); return; }

        // Check if user is admin
        setStatus('checking');
        getDoc(doc(db, 'users', user.uid))
            .then(snap => {
                const role = snap.exists() ? snap.data().role : 'user';
                setStatus(role === 'admin' ? 'redirect-admin' : 'allowed');
            })
            .catch(() => setStatus('allowed')); // On error, allow through
    }, [user, authLoading]);

    if (authLoading || status === 'checking') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (status === 'redirect-admin') {
        return <Navigate to="/admin" replace />;
    }

    return children;
}
