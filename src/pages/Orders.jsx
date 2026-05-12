import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

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
    paid: { label: 'Dibayar', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    shipped: { label: 'Dikirim', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
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

// ── Star Rating Input ─────────────────────────────────────────────────────────
function StarInput({ value, onChange }) {
    const [hovered, setHovered] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} bintang`}
                >
                    {star <= (hovered || value) ? '⭐' : '☆'}
                </button>
            ))}
        </div>
    );
}

// ── Rating Form ───────────────────────────────────────────────────────────────
function RatingForm({ order, user, onSubmitted }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { toast.error('Pilih bintang terlebih dahulu.'); return; }

        setSubmitting(true);
        try {
            // Save review to Firestore reviews collection
            await addDoc(collection(db, 'reviews'), {
                orderId: order.id,
                userId: user.uid,
                userName: user.displayName || 'Pelanggan',
                rating,
                comment: comment.trim(),
                productNames: order.items?.map(i => i.name).join(', ') || '',
                createdAt: serverTimestamp(),
            });

            // Mark order as reviewed so form doesn't show again
            await updateDoc(doc(db, 'orders', order.id), { reviewed: true });

            toast.success('Terima kasih atas ulasanmu! 🌟');
            onSubmitted();
        } catch (err) {
            console.error(err);
            toast.error('Gagal mengirim ulasan. Coba lagi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-sm font-black text-yellow-800 mb-3">⭐ Beri Ulasan Pesanan Ini</p>

            <div className="mb-3">
                <p className="text-xs text-yellow-700 mb-1.5">Rating</p>
                <StarInput value={rating} onChange={setRating} />
            </div>

            <div className="mb-3">
                <p className="text-xs text-yellow-700 mb-1.5">Komentar (opsional)</p>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder="Bagaimana pengalaman belanjamu?"
                    className="w-full border border-yellow-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={submitting || rating === 0}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-black py-2.5 rounded-xl text-sm transition-colors"
            >
                {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
        </form>
    );
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, user, onOrderUpdate }) {
    const [open, setOpen] = useState(false);
    const [showRating, setShowRating] = useState(false);

    const isDelivered = order.status === 'delivered';
    const alreadyReviewed = order.reviewed === true;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-400 font-mono">#{order.id.slice(0, 12).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.timestamp)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
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

            {/* Delivered — prompt to review (visible even when collapsed) */}
            {isDelivered && !alreadyReviewed && !open && (
                <div className="px-6 pb-4">
                    <button
                        onClick={() => setOpen(true)}
                        className="w-full text-center text-xs font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl py-2 hover:bg-yellow-100 transition-colors"
                    >
                        ⭐ Beri ulasan untuk pesanan ini
                    </button>
                </div>
            )}

            {/* Detail */}
            {open && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex flex-col gap-4">
                    {/* Items */}
                    <div>
                        <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Produk</p>
                        <ul className="flex flex-col gap-2">
                            {order.items?.map((item, i) => (
                                <li key={i} className="flex justify-between text-sm text-gray-700">
                                    <span>{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                                    <span className="font-semibold">{formatRupiah(item.price * item.quantity)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Shipping address */}
                    {order.shippingAddress && (
                        <div>
                            <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Alamat Pengiriman</p>
                            <div className="text-sm text-gray-600 leading-relaxed">
                                <p className="font-semibold text-gray-800">{order.shippingAddress.name}</p>
                                <p>{order.shippingAddress.phone}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                            </div>
                        </div>
                    )}

                    {/* Courier & tracking */}
                    {order.courier && (
                        <div>
                            <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Pengiriman</p>
                            <div className="flex items-center gap-2">
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-xs font-bold">
                                    🚚 {order.courier.name}
                                </span>
                                <span className="text-gray-400 text-xs">{order.courier.estimatedDelivery}</span>
                            </div>
                            {order.trackingNumber && (
                                <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                    <p className="text-xs text-green-600">Nomor Resi</p>
                                    <p className="font-bold text-green-800 font-mono">{order.trackingNumber}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rating section — only for delivered orders */}
                    {isDelivered && (
                        <div>
                            {alreadyReviewed ? (
                                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium">
                                    ✅ Kamu sudah memberikan ulasan untuk pesanan ini. Terima kasih!
                                </div>
                            ) : (
                                <>
                                    {!showRating ? (
                                        <button
                                            onClick={() => setShowRating(true)}
                                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black py-2.5 rounded-xl text-sm transition-colors"
                                        >
                                            ⭐ Beri Ulasan
                                        </button>
                                    ) : (
                                        <RatingForm
                                            order={order}
                                            user={user}
                                            onSubmitted={() => {
                                                setShowRating(false);
                                                onOrderUpdate(order.id, { reviewed: true });
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Orders Page ───────────────────────────────────────────────────────────────
export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                let snap;
                try {
                    const q = query(
                        collection(db, 'orders'),
                        where('userId', '==', user.uid),
                        orderBy('timestamp', 'desc')
                    );
                    snap = await getDocs(q);
                } catch {
                    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
                    snap = await getDocs(q);
                }
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

    const handleOrderUpdate = (orderId, updates) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
    };

    return (
        <>
            <SEOHelmet title="Riwayat Pesanan — Giarva" description="Lihat riwayat pesanan Anda di Giarva." />

            <main className="min-h-screen bg-gray-50 py-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-black text-ocean-900">Riwayat Pesanan</h1>
                        <p className="text-gray-500 text-sm mt-1">Semua pesanan yang pernah kamu buat.</p>
                    </div>

                    {loading && <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>}

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
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    user={user}
                                    onOrderUpdate={handleOrderUpdate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
