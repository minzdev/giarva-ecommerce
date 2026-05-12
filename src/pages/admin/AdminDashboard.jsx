import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import LoadingSpinner from '../../components/LoadingSpinner';

const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_COLOR = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-ocean-100 text-ocean-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

function StatCard({ icon, label, value, sub, color }) {
    return (
        <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${color}`}>{icon}</div>
            <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-gray-800 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [ordersSnap, usersSnap, productsSnap, reviewsSnap] = await Promise.all([
                    getDocs(collection(db, 'orders')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'products')),
                    getDocs(collection(db, 'reviews')),
                ]);

                const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const totalRevenue = orders
                    .filter(o => o.status !== 'cancelled')
                    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                setStats({
                    totalOrders: orders.length,
                    totalRevenue,
                    totalUsers: usersSnap.size,
                    totalProducts: productsSnap.size,
                    totalReviews: reviewsSnap.size,
                    pendingOrders: orders.filter(o => o.status === 'pending').length,
                });

                // Recent 5 orders
                const sorted = [...orders].sort((a, b) => {
                    const ta = a.timestamp?.toDate?.() ?? new Date(0);
                    const tb = b.timestamp?.toDate?.() ?? new Date(0);
                    return tb - ta;
                });
                setRecentOrders(sorted.slice(0, 5));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

    if (!stats) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <p className="text-red-500 font-semibold">Gagal memuat data dashboard.</p>
            <p className="text-gray-400 text-sm">Pastikan Firestore rules sudah mengizinkan akses admin.</p>
        </div>
    );

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-black text-gray-800">Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Ringkasan aktivitas toko Giarva.</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <StatCard icon="💰" label="Total Pendapatan" value={formatRupiah(stats.totalRevenue)} color="bg-green-100" />
                <StatCard icon="🧾" label="Total Pesanan" value={stats.totalOrders} sub={`${stats.pendingOrders} menunggu konfirmasi`} color="bg-ocean-100" />
                <StatCard icon="👥" label="Total Pengguna" value={stats.totalUsers} color="bg-purple-100" />
                <StatCard icon="📦" label="Total Produk" value={stats.totalProducts} color="bg-gold-100" />
                <StatCard icon="⭐" label="Total Review" value={stats.totalReviews} color="bg-yellow-100" />
                <StatCard icon="⏳" label="Pesanan Pending" value={stats.pendingOrders} color="bg-red-100" />
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-black text-gray-800">Pesanan Terbaru</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-3 text-left">ID Pesanan</th>
                                <th className="px-6 py-3 text-left">Total</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-left">Tanggal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentOrders.map(o => (
                                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">#{o.id.slice(0, 10).toUpperCase()}</td>
                                    <td className="px-6 py-4 font-bold text-gray-800">{formatRupiah(o.totalAmount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {o.timestamp?.toDate?.().toLocaleDateString('id-ID') ?? '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
