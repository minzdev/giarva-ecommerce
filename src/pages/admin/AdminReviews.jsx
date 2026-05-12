import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function AdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const toast = useToast();

    useEffect(() => {
        getDocs(collection(db, 'reviews'))
            .then(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.timestamp?.toDate?.() ?? 0) - (a.timestamp?.toDate?.() ?? 0));
                setReviews(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDoc(doc(db, 'reviews', deleteTarget.id));
            setReviews(prev => prev.filter(r => r.id !== deleteTarget.id));
            toast.success('Review berhasil dihapus.');
        } catch (e) { console.error(e); toast.error('Gagal menghapus review.'); }
        finally { setDeleteTarget(null); }
    };

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-black text-gray-800">Manajemen Review</h1>
                <p className="text-gray-400 text-sm mt-1">{reviews.length} review</p>
            </div>

            <div className="flex flex-col gap-3">
                {reviews.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Belum ada review.</p>}
                {reviews.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-800 text-sm">{r.userName || 'Anonim'}</span>
                                <span className="text-yellow-500 text-sm">{STARS(r.rating)}</span>
                                <span className="text-xs text-gray-400">
                                    {r.timestamp?.toDate?.().toLocaleDateString('id-ID') ?? '-'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
                            <p className="text-xs text-gray-400 font-mono">Produk: {r.productId}</p>
                        </div>
                        <button onClick={() => setDeleteTarget(r)} className="flex-shrink-0 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            Hapus
                        </button>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Review?"
                message={`Review dari "${deleteTarget?.userName || 'pengguna'}" akan dihapus permanen.`}
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
