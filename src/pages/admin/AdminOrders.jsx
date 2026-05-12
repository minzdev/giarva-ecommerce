import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const STATUS_COLOR = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-ocean-100 text-ocean-700 border-ocean-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};
const STATUS_LABEL = {
    pending: 'Menunggu', processing: 'Diproses', shipped: 'Dikirim', delivered: 'Selesai', cancelled: 'Dibatalkan',
};

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [statusChange, setStatusChange] = useState(null); // { orderId, status }
    const toast = useToast();

    useEffect(() => {
        getDocs(collection(db, 'orders'))
            .then(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => (b.timestamp?.toDate?.() ?? 0) - (a.timestamp?.toDate?.() ?? 0));
                setOrders(data);
            })
            .finally(() => setLoading(false));
    }, []);

    const updateStatus = async () => {
        if (!statusChange) return;
        const { orderId, status } = statusChange;
        setUpdating(orderId);
        try {
            await updateDoc(doc(db, 'orders', orderId), { status });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            toast.success(`Status pesanan diperbarui ke "${STATUS_LABEL[status]}".`);
        } catch (e) {
            console.error(e);
            toast.error('Gagal memperbarui status.');
        } finally {
            setUpdating(null);
            setStatusChange(null);
        }
    };

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-black text-gray-800">Manajemen Pesanan</h1>
                <p className="text-gray-400 text-sm mt-1">{orders.length} total pesanan</p>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2">
                {['all', ...STATUSES].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === s ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-gray-600 border-gray-200 hover:border-ocean-400'}`}>
                        {s === 'all' ? 'Semua' : STATUS_LABEL[s]}
                    </button>
                ))}
            </div>

            {/* Orders list */}
            <div className="flex flex-col gap-3">
                {filtered.length === 0 && <p className="text-gray-400 text-sm py-10 text-center">Tidak ada pesanan.</p>}
                {filtered.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                            <div className="flex flex-col gap-1">
                                <p className="font-mono text-xs text-gray-400">#{order.id.slice(0, 12).toUpperCase()}</p>
                                <p className="text-sm text-gray-500">
                                    {order.timestamp?.toDate?.().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) ?? '-'}
                                </p>
                                <p className="text-xs text-gray-400">{order.shippingAddress?.name} · {order.shippingAddress?.phone}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="font-black text-ocean-700">{formatRupiah(order.totalAmount)}</p>
                                {/* Status dropdown */}
                                <select
                                    value={order.status}
                                    onChange={e => setStatusChange({ orderId: order.id, status: e.target.value })}
                                    disabled={updating === order.id}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-ocean-400 ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                                >
                                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                                </select>
                                <button onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                                    className="text-xs text-ocean-600 font-semibold hover:underline">
                                    {expanded === order.id ? 'Tutup ▲' : 'Detail ▼'}
                                </button>
                            </div>
                        </div>
                        {expanded === order.id && (
                            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 text-sm">
                                <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Produk</p>
                                <ul className="flex flex-col gap-1 mb-4">
                                    {order.items?.map((item, i) => (
                                        <li key={i} className="flex justify-between text-gray-700">
                                            <span>{item.name} ×{item.quantity}</span>
                                            <span className="font-semibold">{formatRupiah(item.price * item.quantity)}</span>
                                        </li>
                                    ))}
                                </ul>
                                {order.shippingAddress && (
                                    <>
                                        <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Alamat</p>
                                        <p className="text-gray-600 leading-relaxed">
                                            {order.shippingAddress.name} · {order.shippingAddress.phone}<br />
                                            {order.shippingAddress.address}, {order.shippingAddress.city} {order.shippingAddress.postalCode}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!statusChange}
                title="Update Status Pesanan?"
                message={`Status pesanan akan diubah menjadi "${STATUS_LABEL[statusChange?.status]}". Tindakan ini akan memberitahu pelanggan.`}
                confirmLabel="Ya, Update"
                cancelLabel="Batal"
                variant="info"
                onConfirm={updateStatus}
                onCancel={() => setStatusChange(null)}
            />
        </div>
    );
}
