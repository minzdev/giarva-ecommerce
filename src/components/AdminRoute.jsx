import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function AdminRoute({ children }) {
    const { user, loading: authLoading } = useAuth();
    const [roleStatus, setRoleStatus] = useState('checking'); // 'checking' | 'admin' | 'denied' | 'unauthenticated'

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return;

        // Not logged in
        if (!user) {
            setRoleStatus('unauthenticated');
            return;
        }

        // Check role in Firestore
        setRoleStatus('checking');
        getDoc(doc(db, 'users', user.uid))
            .then(snap => {
                const role = snap.exists() ? snap.data().role : null;
                console.log('[AdminRoute] user uid:', user.uid, '| role:', role);
                setRoleStatus(role === 'admin' ? 'admin' : 'denied');
            })
            .catch(err => {
                console.error('[AdminRoute] Firestore error:', err);
                setRoleStatus('denied');
            });
    }, [user, authLoading]);

    // Still loading auth or checking role
    if (authLoading || roleStatus === 'checking') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (roleStatus === 'unauthenticated') return <Navigate to="/login" state={{ from: { pathname: '/admin' } }} replace />;
    if (roleStatus === 'denied') return <Navigate to="/" replace />;
    return children;
}
