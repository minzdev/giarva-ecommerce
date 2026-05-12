import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './useAuth';

/**
 * Returns { isAdmin: boolean | null, loading: boolean }
 * null = still checking
 */
export function useAdminRole() {
    const { user, loading: authLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setIsAdmin(false); setLoading(false); return; }

        getDoc(doc(db, 'users', user.uid))
            .then(snap => {
                setIsAdmin(snap.exists() && snap.data().role === 'admin');
            })
            .catch(() => setIsAdmin(false))
            .finally(() => setLoading(false));
    }, [user, authLoading]);

    return { isAdmin, loading: authLoading || loading };
}
