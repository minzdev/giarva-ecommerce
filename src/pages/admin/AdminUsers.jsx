import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [roleTarget, setRoleTarget] = useState(null); // { userId, currentRole }
    const toast = useToast();

    useEffect(() => {
        getDocs(collection(db, 'users'))
            .then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .finally(() => setLoading(false));
    }, []);

    const toggleAdmin = async () => {
        if (!roleTarget) return;
        const { userId, currentRole } = roleTarget;
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        setUpdating(userId);
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            toast.success(`Role berhasil diubah menjadi "${newRole}".`);
        } catch (e) {
            console.error(e);
            toast.error('Gagal mengubah role.');
        } finally {
            setUpdating(null);
            setRoleTarget(null);
        }
    };

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-black text-gray-800">Manajemen Pengguna</h1>
                <p className="text-gray-400 text-sm mt-1">{users.length} pengguna terdaftar</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-3 text-left">Pengguna</th>
                                <th className="px-6 py-3 text-left">Email</th>
                                <th className="px-6 py-3 text-left">HP</th>
                                <th className="px-6 py-3 text-left">Role</th>
                                <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 font-black text-sm flex items-center justify-center">
                                                {(u.displayName || u.email || '?')[0].toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-gray-800">{u.displayName || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{u.email}</td>
                                    <td className="px-6 py-4 text-gray-500">{u.phone || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-ocean-100 text-ocean-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {u.role || 'user'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setRoleTarget({ userId: u.id, currentRole: u.role })} disabled={updating === u.id}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${u.role === 'admin' ? 'text-red-600 hover:bg-red-50' : 'text-ocean-600 hover:bg-ocean-50'}`}>
                                            {updating === u.id ? '…' : u.role === 'admin' ? 'Cabut Admin' : 'Jadikan Admin'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Belum ada pengguna.</p>}
                </div>
            </div>

            <ConfirmDialog
                open={!!roleTarget}
                title={roleTarget?.currentRole === 'admin' ? 'Cabut Role Admin?' : 'Jadikan Admin?'}
                message={roleTarget?.currentRole === 'admin'
                    ? 'User ini tidak akan bisa mengakses admin panel lagi.'
                    : 'User ini akan mendapatkan akses penuh ke admin panel.'}
                confirmLabel={roleTarget?.currentRole === 'admin' ? 'Ya, Cabut' : 'Ya, Jadikan Admin'}
                cancelLabel="Batal"
                variant={roleTarget?.currentRole === 'admin' ? 'danger' : 'warning'}
                onConfirm={toggleAdmin}
                onCancel={() => setRoleTarget(null)}
            />
        </div>
    );
}
