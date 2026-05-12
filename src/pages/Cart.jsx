import { useNavigate } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import LazyImage from '../components/LazyImage';
import { useCart } from '../hooks/useCart';
import { useToast } from '../context/ToastContext';

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Cart Item ─────────────────────────────────────────────────────────────────
function CartItem({ item, onRemove, onUpdate }) {
    const toast = useToast();

    const handleRemove = () => {
        onRemove(item.productId);
        toast.info(`${item.name} dihapus dari keranjang.`);
    };

    return (
        <li className="flex items-center gap-4 py-5 border-b border-gray-100 last:border-0">
            {/* Image */}
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100">
                <LazyImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain p-1"
                    placeholderColor="bg-gray-100"
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm leading-snug truncate">{item.name}</p>
                <p className="text-ocean-600 font-semibold text-sm mt-0.5">{fmt(item.price)}</p>
            </div>

            {/* Qty controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button type="button" onClick={() => onUpdate(item.productId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 hover:text-ocean-600 font-bold text-lg flex items-center justify-center transition-colors focus:outline-none"
                    aria-label="Kurangi">−</button>
                <span className="w-8 text-center text-sm font-black text-gray-800">{item.quantity}</span>
                <button type="button" onClick={() => onUpdate(item.productId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-sm text-gray-600 hover:text-ocean-600 font-bold text-lg flex items-center justify-center transition-colors focus:outline-none"
                    aria-label="Tambah">+</button>
            </div>

            {/* Subtotal */}
            <p className="font-black text-gray-800 text-sm w-24 text-right flex-shrink-0 hidden sm:block">
                {fmt(item.price * item.quantity)}
            </p>

            {/* Delete */}
            <button type="button" onClick={handleRemove}
                className="text-gray-300 hover:text-red-500 transition-colors focus:outline-none flex-shrink-0"
                aria-label={`Hapus ${item.name}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </li>
    );
}

// ── Cart Page ─────────────────────────────────────────────────────────────────
export default function Cart() {
    const navigate = useNavigate();
    const { items, totalAmount, totalItems, removeItem, updateQuantity } = useCart();

    return (
        <>
            <SEOHelmet title="Keranjang Belanja — Giarva" description="Kelola produk di keranjang belanja Anda." />

            <main className="min-h-screen py-10" style={{ background: 'linear-gradient(160deg, #f0f4f7 0%, #e3f2fd 100%)' }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-black text-ocean-900">Keranjang Belanja</h1>
                        <p className="text-gray-500 text-sm mt-1">{totalItems} produk dipilih</p>
                    </div>

                    {items.length === 0 ? (
                        /* Empty state */
                        <div className="bg-white rounded-3xl shadow-sm p-16 flex flex-col items-center gap-5 text-center">
                            <div className="w-20 h-20 rounded-full bg-ocean-100 flex items-center justify-center text-4xl">🛒</div>
                            <div>
                                <p className="text-xl font-black text-gray-700">Keranjang masih kosong</p>
                                <p className="text-gray-400 text-sm mt-1">Yuk tambahkan produk Giarva favoritmu!</p>
                            </div>
                            <button type="button" onClick={() => navigate('/')}
                                className="bg-ocean-600 hover:bg-ocean-700 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-colors text-sm uppercase tracking-widest"
                                style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                Mulai Belanja
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6 items-start">

                            {/* Item list */}
                            <section className="flex-1 bg-white rounded-3xl shadow-sm p-6" aria-label="Daftar item">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-black text-gray-800">Produk ({totalItems})</h2>
                                </div>
                                <ul role="list">
                                    {items.map(item => (
                                        <CartItem key={item.productId} item={item}
                                            onRemove={removeItem} onUpdate={updateQuantity} />
                                    ))}
                                </ul>
                            </section>

                            {/* Summary */}
                            <aside className="w-full lg:w-80 flex flex-col gap-4 lg:sticky lg:top-24">
                                <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-4">
                                    <h2 className="font-black text-gray-800 text-lg">Ringkasan</h2>

                                    <div className="flex flex-col gap-3 text-sm">
                                        <div className="flex justify-between text-gray-500">
                                            <span>Subtotal ({totalItems} item)</span>
                                            <span className="font-semibold text-gray-700">{fmt(totalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-500">
                                            <span>Ongkos kirim</span>
                                            <span className="text-ocean-500 font-semibold">Dihitung saat checkout</span>
                                        </div>
                                        <div className="h-px bg-gray-100" />
                                        <div className="flex justify-between items-center">
                                            <span className="font-black text-gray-800 text-base">Total</span>
                                            <span className="font-black text-ocean-600 text-xl">{fmt(totalAmount)}</span>
                                        </div>
                                    </div>

                                    <button type="button" onClick={() => navigate('/checkout')}
                                        className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-black py-4 rounded-2xl shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-sm uppercase tracking-widest"
                                        style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.3)' }}>
                                        Lanjut ke Checkout →
                                    </button>

                                    <button type="button" onClick={() => navigate('/')}
                                        className="w-full text-gray-400 hover:text-ocean-600 font-semibold py-2 text-sm transition-colors text-center">
                                        ← Lanjut Belanja
                                    </button>
                                </div>

                                {/* Trust badges */}
                                <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3">
                                    {[
                                        { icon: '🔒', text: 'Pembayaran aman & terenkripsi' },
                                        { icon: '🚚', text: 'Pengiriman ke seluruh Indonesia' },
                                        { icon: '✅', text: 'Produk 100% original & halal' },
                                    ].map(({ icon, text }) => (
                                        <div key={text} className="flex items-center gap-3 text-sm text-gray-500">
                                            <span className="text-base">{icon}</span>
                                            <span>{text}</span>
                                        </div>
                                    ))}
                                </div>
                            </aside>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
