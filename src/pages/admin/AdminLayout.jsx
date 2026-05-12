import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const NAV = [
    { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/products', label: 'Produk', icon: '📦' },
    { to: '/admin/orders', label: 'Pesanan', icon: '🧾' },
    { to: '/admin/users', label: 'Pengguna', icon: '👥' },
    { to: '/admin/reviews', label: 'Review', icon: '⭐' },
];

export default function AdminLayout() {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            toast.success('Berhasil keluar dari admin panel.');
            navigate('/login');
        } catch (e) {
            console.error(e);
            toast.error('Gagal keluar. Coba lagi.');
        }
        setShowLogoutDialog(false);
    };

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isActive
            ? 'bg-ocean-600 text-white shadow-md'
            : 'text-gray-600 hover:bg-ocean-50 hover:text-ocean-700'
        }`;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:shadow-none lg:border-r lg:border-gray-100`}>
                {/* Brand */}
                <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xl font-black text-ocean-700">Giarva</p>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mt-0.5">Admin Panel</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
                    {NAV.map(({ to, label, icon, end }) => (
                        <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setSidebarOpen(false)}>
                            <span>{icon}</span>
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Sign out */}
                <div className="px-4 py-4 border-t border-gray-100">
                    <button onClick={() => setShowLogoutDialog(true)}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        🚪 Keluar
                    </button>
                </div>
            </aside>

            {/* Overlay mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
                    <button className="lg:hidden text-gray-600 hover:text-ocean-600" onClick={() => setSidebarOpen(true)} aria-label="Buka menu">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="text-sm text-gray-400 font-medium">Admin Panel</span>
                    <a href="/" target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-xs text-ocean-600 hover:underline font-semibold">
                        Lihat Toko →
                    </a>
                </header>

                {/* Page content */}
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>

            <ConfirmDialog
                open={showLogoutDialog}
                title="Keluar dari Admin Panel?"
                message="Kamu akan keluar dari sesi admin. Pastikan semua perubahan sudah tersimpan."
                confirmLabel="Ya, Keluar"
                cancelLabel="Batal"
                variant="warning"
                onConfirm={handleSignOut}
                onCancel={() => setShowLogoutDialog(false)}
            />
        </div>
    );
}
