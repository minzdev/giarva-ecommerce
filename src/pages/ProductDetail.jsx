import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import { useCart } from '../hooks/useCart';
import LoadingSpinner from '../components/LoadingSpinner';
import LazyImage from '../components/LazyImage';
import SEOHelmet from '../components/SEOHelmet';
import ReviewSystem from '../components/ReviewSystem';

// ─── Price formatter ──────────────────────────────────────────────────────────

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
});

// ─── Back arrow icon ──────────────────────────────────────────────────────────

function IconArrowLeft() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
    );
}

// ─── Cart icon ────────────────────────────────────────────────────────────────

function IconCart() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
        </svg>
    );
}

// ─── ProductDetail Page ───────────────────────────────────────────────────────

export default function ProductDetail() {
    const { id: productId } = useParams();
    const { product, loading, error } = useProduct(productId);
    const { addItem } = useCart();

    // ── Loading state ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
                <LoadingSpinner size="lg" />
                <p className="text-gray-500 text-sm">Memuat produk…</p>
            </div>
        );
    }

    // ── Error / not found state ────────────────────────────────────────────────
    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white px-6 text-center">
                <p className="text-red-500 font-medium text-lg">
                    {error ?? 'Produk tidak ditemukan'}
                </p>
                <p className="text-gray-400 text-sm">
                    Produk yang Anda cari tidak tersedia atau telah dihapus.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-ocean-600 hover:text-ocean-700 font-medium text-sm transition-colors duration-150"
                >
                    <IconArrowLeft />
                    Kembali ke Beranda
                </Link>
            </div>
        );
    }

    // ── Derived values ─────────────────────────────────────────────────────────
    const { name, price, description, imageUrl, category } = product;

    // SEO description: truncate to 160 chars
    const seoDescription = description
        ? description.length > 160
            ? description.slice(0, 157) + '…'
            : description
        : `Beli ${name} dari Giarva. Susu kambing etawa premium berkualitas tinggi.`;

    const seoKeywords = `${name}, susu kambing etawa, giarva`;

    const handleAddToCart = () => {
        addItem(product, 1);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <>
            <SEOHelmet
                title={`${name} — Giarva`}
                description={seoDescription}
                keywords={seoKeywords}
                ogImage={imageUrl}
            />

            <main className="min-h-screen bg-white">
                {/* ── Breadcrumb / back navigation ─────────────────────────── */}
                <div className="max-w-6xl mx-auto px-6 pt-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-ocean-600 hover:text-ocean-700 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 rounded"
                    >
                        <IconArrowLeft />
                        Kembali ke Beranda
                    </Link>
                </div>

                {/* ── Product section ───────────────────────────────────────── */}
                <section
                    className="max-w-6xl mx-auto px-6 py-10"
                    aria-label="Detail produk"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Product image */}
                        <div className="w-full">
                            <LazyImage
                                src={imageUrl}
                                alt={`Gambar produk ${name}`}
                                className="w-full aspect-square object-cover rounded-2xl shadow-md"
                                placeholderColor="bg-ocean-50"
                            />
                        </div>

                        {/* Product info */}
                        <div className="flex flex-col gap-6">
                            {/* Category badge */}
                            {category && (
                                <span className="inline-block self-start bg-ocean-100 text-ocean-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                                    {category}
                                </span>
                            )}

                            {/* Product name */}
                            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 leading-tight">
                                {name}
                            </h1>

                            {/* Price */}
                            <p className="text-3xl font-bold text-ocean-600">
                                {rupiahFormatter.format(price)}
                            </p>

                            {/* Description */}
                            <div className="prose prose-sm text-gray-600 leading-relaxed max-w-none">
                                <p>{description}</p>
                            </div>

                            {/* Add to cart button */}
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="inline-flex items-center justify-center gap-2 bg-ocean-500 hover:bg-ocean-600 active:bg-ocean-700 text-white font-semibold px-8 py-4 rounded-xl shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base w-full sm:w-auto"
                            >
                                <IconCart />
                                Tambah ke Keranjang
                            </button>

                            {/* Stock info (if available) */}
                            {typeof product.stock === 'number' && (
                                <p className="text-sm text-gray-400">
                                    Stok tersedia:{' '}
                                    <span className="font-medium text-gray-600">
                                        {product.stock} unit
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Divider ───────────────────────────────────────────────── */}
                <div className="max-w-6xl mx-auto px-6">
                    <hr className="border-gray-100" />
                </div>

                {/* ── Review System ─────────────────────────────────────────── */}
                <section className="max-w-6xl mx-auto px-6 pb-20">
                    <ReviewSystem productId={productId} />
                </section>
            </main>
        </>
    );
}
