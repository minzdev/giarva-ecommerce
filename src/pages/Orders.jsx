import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import LoadingSpinner from '../components/LoadingSpinner';

const formatRupiah = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const STATUS_MAP = {
    pending_payment: { label: 'Menunggu Pembayaran', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    pending: { label: 'Menunggu Konfirmasi', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    paid: { label: 'Dibayar', color: 'bg-green-100 text-green-700 border-green-200' },
    processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    shipped: { label: 'Dikirim', color: 'bg-ocean-100 text-ocean-700 border-ocean-200' },
    delivered: { label: 'Selesai', color: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700 border-red-200' },
};

function StatusBadge({ status }) {
    const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
    return (
        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${s.color} uppercase tracking-wide`}>
            {s.label}
        </span>
    );
}

function OrderCard({ order }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 12).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.timestamp)}</p>
                </div>
                <div className="flex items-center gap-4">
                    <StatusBadge status={order.status} />
                    <p className="text-base font-black text-ocean-700">{formatRupiah(order.totalAmount)}</p>
                    <button
                        type="button"
                        onClick={() => setOpen(o => !o)}
                        className="text-sm text-ocean-600 hover:text-ocean-700 font-semibold focus:outline-none"
                        aria-expanded={open}
                    >
                        {open ? 'Tutup ▲' : 'Detail ▼'}
                    </button>
                </div>
            </div>

            {/* Detail */}
            {open && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50">
                    {/* Items */}
                    <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-3">Produk</p>
                    <ul className="flex flex-col gap-2 mb-4">
                        {order.items?.map((item, i) => (
                            <li key={i} className="flex justify-between text-sm text-gray-700">
                                <span>{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                                <span className="font-semibold">{formatRupiah(item.price * item.quantity)}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Shipping address */}
                    {order.shippingAddress && (
                        <>
                            <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Alamat Pengiriman</p>
                            <div className="text-sm text-gray-600 leading-relaxed">
                                <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
                                <p>{order.shippingAddress.phone}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                // Try with orderBy first, fall back without it if index missing
                let snap;
                try {
                    const q = query(
                        collection(db, 'orders'),
                        where('userId', '==', user.uid),
                        orderBy('timestamp', 'desc')
                    );
                    snap = await getDocs(q);
                } catch {
                    // Fallback: query without orderBy (no composite index needed)
                    const q = query(
                        collection(db, 'orders'),
                        where('userId', '==', user.uid)
                    );
                    snap = await getDocs(q);
                }
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort client-side
                list.sort((a, b) => {
                    const ta = a.timestamp?.toDate?.() ?? new Date(0);
                    const tb = b.timestamp?.toDate?.() ?? new Date(0);
                    return tb - ta;
                });
                setOrders(list);
            } catch (e) {
                console.error(e);
                setError('Gagal memuat riwayat pesanan. Coba muat ulang halaman.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    return (
        <>
            <SEOHelmet title="Riwayat Pesanan — Giarva" description="Lihat riwayat pesanan Anda di Giarva." />

            <main className="min-h-screen bg-gray-50 py-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-black text-ocean-900">Riwayat Pesanan</h1>
                        <p className="text-gray-500 text-sm mt-1">Semua pesanan yang pernah kamu buat.</p>
                    </div>

                    {loading && (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner size="lg" />
                        </div>
                    )}

                    {!loading && error && (
                        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-4 text-sm">
                            {error}
                        </div>
                    )}

                    {!loading && !error && orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                            <div className="w-20 h-20 rounded-full bg-ocean-100 flex items-center justify-center text-4xl">📦</div>
                            <p className="text-gray-600 font-semibold text-lg">Belum ada pesanan</p>
                            <p className="text-gray-400 text-sm">Yuk mulai belanja produk Giarva!</p>
                            <Link to="/"
                                className="mt-2 bg-ocean-600 hover:bg-ocean-700 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-colors text-sm uppercase tracking-widest"
                                style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                Belanja Sekarang
                            </Link>
                        </div>
                    )}

                    {!loading && !error && orders.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {orders.map(order => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
