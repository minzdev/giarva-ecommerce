import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "./ConfirmDialog";

function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const { user, signOut } = useAuth();
    const { totalItems, clearCart } = useCart();
    const toast = useToast();
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const navLinkClass = ({ isActive }) =>
        `text-sm font-semibold transition-colors hover:text-ocean-600 ${isActive ? "text-ocean-600" : "text-gray-700"}`;

    const handleSignOut = async () => {
        try {
            clearCart();
            await signOut();
            toast.success('Berhasil keluar. Sampai jumpa!');
            navigate('/');
        } catch (e) {
            console.error(e);
            toast.error('Gagal keluar. Coba lagi.');
        }
        setDropdownOpen(false);
        setMenuOpen(false);
        setShowLogoutDialog(false);
    };

    const closeMenu = () => setMenuOpen(false);
    const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();

    return (
        <>
            <nav className="sticky top-0 z-50 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Brand */}
                        <Link to="/" className="text-xl font-black text-ocean-700 tracking-wide" onClick={closeMenu}>
                            Giarva
                        </Link>

                        {/* Desktop nav */}
                        <div className="hidden md:flex items-center gap-6">
                            <NavLink to="/" end className={navLinkClass}>Home</NavLink>

                            {/* Cart */}
                            <NavLink to="/cart" className={navLinkClass}>
                                <span className="relative inline-flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>Cart</span>
                                    {totalItems > 0 && (
                                        <span className="absolute -top-2 -right-4 bg-gold-400 text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
                                            {totalItems > 99 ? "99+" : totalItems}
                                        </span>
                                    )}
                                </span>
                            </NavLink>

                            {/* Auth */}
                            {user ? (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setDropdownOpen(o => !o)}
                                        className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-ocean-400 rounded-full"
                                        aria-expanded={dropdownOpen}
                                        aria-haspopup="true"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-ocean-100 text-ocean-700 font-black text-sm flex items-center justify-center select-none border-2 border-ocean-200">
                                            {initial}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700 max-w-[120px] truncate">
                                            {user.displayName || user.email}
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown */}
                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                                            <div className="px-4 py-2 border-b border-gray-100 mb-1">
                                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                            </div>
                                            <Link
                                                to="/profile"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-ocean-50 hover:text-ocean-700 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Profil Saya
                                            </Link>
                                            <Link
                                                to="/orders"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-ocean-50 hover:text-ocean-700 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                                Riwayat Pesanan
                                            </Link>
                                            <hr className="my-1 border-gray-100" />
                                            <button
                                                type="button"
                                                onClick={() => { setDropdownOpen(false); setShowLogoutDialog(true); }}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Keluar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <NavLink to="/login" className={navLinkClass}>Login</NavLink>
                                    <NavLink to="/register"
                                        className="text-sm font-bold text-white bg-ocean-600 hover:bg-ocean-700 px-4 py-2 rounded-xl transition-colors shadow-sm">
                                        Register
                                    </NavLink>
                                </div>
                            )}
                        </div>

                        {/* Mobile: cart + hamburger */}
                        <div className="flex md:hidden items-center gap-3">
                            <Link to="/cart" className="relative text-gray-700" onClick={closeMenu}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {totalItems > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-gold-400 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {totalItems > 9 ? "9+" : totalItems}
                                    </span>
                                )}
                            </Link>
                            <button
                                onClick={() => setMenuOpen(p => !p)}
                                aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                                aria-expanded={menuOpen}
                                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                {menuOpen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3">
                        <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>Home</NavLink>
                        <NavLink to="/cart" className={navLinkClass} onClick={closeMenu}>
                            <span className="flex items-center gap-2">
                                🛒 Cart
                                {totalItems > 0 && (
                                    <span className="bg-gold-400 text-white text-xs font-black rounded-full px-1.5 py-0.5 leading-none">{totalItems}</span>
                                )}
                            </span>
                        </NavLink>
                        {user ? (
                            <>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 font-black text-sm flex items-center justify-center">{initial}</div>
                                    <span className="text-sm font-semibold text-gray-700 truncate">{user.displayName || user.email}</span>
                                </div>
                                <Link to="/orders" onClick={closeMenu} className="text-sm font-medium text-gray-700 hover:text-ocean-600 flex items-center gap-2">
                                    📦 Riwayat Pesanan
                                </Link>
                                <Link to="/profile" onClick={closeMenu} className="text-sm font-medium text-gray-700 hover:text-ocean-600 flex items-center gap-2">
                                    👤 Profil Saya
                                </Link>
                                <button onClick={() => { setMenuOpen(false); setShowLogoutDialog(true); }} className="text-sm font-medium text-red-600 hover:text-red-700 text-left flex items-center gap-2">
                                    🚪 Keluar
                                </button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/login" className={navLinkClass} onClick={closeMenu}>Login</NavLink>
                                <NavLink to="/register" onClick={closeMenu}
                                    className="text-sm font-bold text-white bg-ocean-600 hover:bg-ocean-700 px-4 py-2 rounded-xl transition-colors text-center">
                                    Register
                                </NavLink>
                            </>
                        )}
                    </div>
                )}
            </nav>
            <ConfirmDialog
                open={showLogoutDialog}
                title="Keluar dari Akun?"
                message="Kamu akan keluar dari akun Giarva. Keranjang belanja akan dikosongkan."
                confirmLabel="Ya, Keluar"
                cancelLabel="Batal"
                variant="warning"
                onConfirm={handleSignOut}
                onCancel={() => setShowLogoutDialog(false)}
            />
        </>
    );
}

export default Navbar;
