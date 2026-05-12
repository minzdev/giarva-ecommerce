import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STATUSES = ['pending_payment', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
const STATUS_COLOR = {
    pending_payment: 'bg-orange-100 text-orange-700 border-orange-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    paid: 'bg-teal-100 text-teal-700 border-teal-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    delivered: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
};
const STATUS_LABEL = {
    pending_payment: 'Menunggu Bayar',
    pending: 'Menunggu Konfirmasi',
    paid: 'Sudah Dibayar',
    processing: 'Diproses',
    shipped: 'Dikirim',
    delivered: 'Selesai',
    cancelled: 'Dibatalkan',
};

// Tracking number input component
function TrackingInput({ order, onSave }) {
    const [resi, setResi] = useState(order.trackingNumber || '');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const handleSave = async () => {
        if (!resi.trim()) return;
        setSaving(true);
        try {
            await onSave(order.id, resi.trim());
            toast.success('Nomor resi berhasil disimpan.');
        } catch {
            toast.error('Gagal menyimpan nomor resi.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-2 mt-1">
            <input
                type="text"
                value={resi}
                onChange={e => setResi(e.target.value)}
                placeholder="Masukkan nomor resi..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <button
                onClick={handleSave}
                disabled={saving || !resi.trim()}
                className="px-3 py-1.5 bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
            >
                {saving ? '...' : 'Simpan'}
            </button>
        </div>
    );
}

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [statusChange, setStatusChange] = useState(null);
    const toast = useToast();

    useEffect(() => {
        getDocs(collection(db, 'orders'))
            .then(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => {
                        const ta = a.timestamp?.toDate?.() ?? new Date(0);
                        const tb = b.timestamp?.toDate?.() ?? new Date(0);
                        return tb - ta;
                    });
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
            toast.success(`Status diperbarui ke "${STATUS_LABEL[status]}".`);
        } catch {
            toast.error('Gagal memperbarui status.');
        } finally {
            setUpdating(null);
            setStatusChange(null);
        }
    };

    const saveTracking = async (orderId, trackingNumber) => {
        await updateDoc(doc(db, 'orders', orderId), {
            trackingNumber,
            status: 'shipped', // auto-update to shipped when resi is added
        });
        setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, trackingNumber, status: 'shipped' } : o
        ));
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
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === s
                                ? 'bg-ocean-600 text-white border-ocean-600'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-ocean-400'
                            }`}>
                        {s === 'all' ? 'Semua' : STATUS_LABEL[s]}
                    </button>
                ))}
            </div>

            {/* Orders list */}
            <div className="flex flex-col gap-3">
                {filtered.length === 0 && (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada pesanan.</p>
                )}
                {filtered.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                        {/* Order header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4">
                            <div className="flex flex-col gap-1">
                                <p className="font-mono text-xs text-gray-400">
                                    #{order.id.slice(0, 12).toUpperCase()}
                                </p>
                                <p className="text-sm text-gray-500">{formatDate(order.timestamp)}</p>
                                <p className="text-xs text-gray-500 font-medium">
                                    {order.shippingAddress?.name} · {order.shippingAddress?.phone}
                                </p>
                                {/* Courier badge — prominent for admin */}
                                {order.courier && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                                            🚚 {order.courier.name}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {order.courier.serviceType} · {order.courier.estimatedDelivery}
                                        </span>
                                    </div>
                                )}
                                {/* Tracking number if exists */}
                                {order.trackingNumber && (
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                                            📦 Resi: {order.trackingNumber}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <p className="font-black text-ocean-700">{formatRupiah(order.totalAmount)}</p>

                                {/* Status dropdown */}
                                <select
                                    value={order.status || 'pending'}
                                    onChange={e => setStatusChange({ orderId: order.id, status: e.target.value })}
                                    disabled={updating === order.id}
                                    className={`text-xs font-bold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-ocean-400 ${STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}
                                >
                                    {STATUSES.map(s => (
                                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                                    className="text-xs text-ocean-600 font-semibold hover:underline"
                                >
                                    {expanded === order.id ? 'Tutup ▲' : 'Detail ▼'}
                                </button>
                            </div>
                        </div>

                        {/* Order detail */}
                        {expanded === order.id && (
                            <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 flex flex-col gap-5 text-sm">

                                {/* Products */}
                                <div>
                                    <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Produk</p>
                                    <ul className="flex flex-col gap-1">
                                        {order.items?.map((item, i) => (
                                            <li key={i} className="flex justify-between text-gray-700">
                                                <span>{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                                                <span className="font-semibold">{formatRupiah(item.price * item.quantity)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col gap-1 text-xs text-gray-500">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span>{formatRupiah(order.subtotal || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Ongkos Kirim</span>
                                            <span>{formatRupiah(order.shippingCost || 0)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-700">
                                            <span>Total</span>
                                            <span>{formatRupiah(order.totalAmount || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Alamat Pengiriman</p>
                                        <div className="text-gray-600 leading-relaxed">
                                            <p className="font-semibold text-gray-800">{order.shippingAddress?.name}</p>
                                            <p>{order.shippingAddress?.phone}</p>
                                            <p>{order.shippingAddress?.address}</p>
                                            <p>{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Info Pengiriman</p>
                                        {order.courier ? (
                                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">🚚</span>
                                                    <span className="font-bold text-indigo-800 text-base">{order.courier.name}</span>
                                                </div>
                                                <p className="text-xs text-indigo-600">
                                                    Layanan: <strong>{order.courier.serviceType}</strong>
                                                </p>
                                                <p className="text-xs text-indigo-600">
                                                    Estimasi: <strong>{order.courier.estimatedDelivery}</strong>
                                                </p>
                                                <p className="text-xs text-indigo-600">
                                                    Berat: <strong>{order.orderWeight ? `${order.orderWeight} kg` : '-'}</strong>
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 text-xs">Data kurir tidak tersedia</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tracking number input */}
                                <div>
                                    <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">
                                        Nomor Resi Pengiriman
                                    </p>
                                    {order.trackingNumber ? (
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                                                <p className="text-xs text-green-600 font-medium">Nomor Resi</p>
                                                <p className="font-bold text-green-800 font-mono text-base">{order.trackingNumber}</p>
                                            </div>
                                            <button
                                                onClick={() => setOrders(prev => prev.map(o =>
                                                    o.id === order.id ? { ...o, _editResi: true } : o
                                                ))}
                                                className="text-xs text-ocean-600 hover:underline font-semibold"
                                            >
                                                Ubah
                                            </button>
                                        </div>
                                    ) : null}

                                    {(!order.trackingNumber || order._editResi) && (
                                        <div>
                                            {!order.trackingNumber && (
                                                <p className="text-xs text-gray-400 mb-2">
                                                    Masukkan nomor resi setelah paket dikirim. Status akan otomatis berubah ke "Dikirim".
                                                </p>
                                            )}
                                            <TrackingInput order={order} onSave={saveTracking} />
                                        </div>
                                    )}
                                </div>

                                {/* Payment info */}
                                <div>
                                    <p className="text-xs font-black text-ocean-700 uppercase tracking-widest mb-2">Pembayaran</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span className="bg-gray-100 px-2 py-1 rounded-lg font-medium">
                                            {order.paymentMethod?.name || '-'}
                                        </span>
                                        {order.midtransOrderId && (
                                            <span className="text-gray-400 font-mono">
                                                ID: {order.midtransOrderId}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <ConfirmDialog
                open={!!statusChange}
                title="Update Status Pesanan?"
                message={`Status pesanan akan diubah menjadi "${STATUS_LABEL[statusChange?.status]}".`}
                confirmLabel="Ya, Update"
                cancelLabel="Batal"
                variant="info"
                onConfirm={updateStatus}
                onCancel={() => setStatusChange(null)}
            />
        </div>
    );
}
