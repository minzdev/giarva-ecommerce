import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import SEOHelmet from '../components/SEOHelmet';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProducts } from '../hooks/useProduct';
import { useCart } from '../hooks/useCart';
import heroImage from '../assets/hero.png';

// ─── Feature icons (inline SVG) ──────────────────────────────────────────────

function IconDigest() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-ocean-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3C8.686 3 6 5.686 6 9c0 2.21.895 4.21 2.343 5.657A8.003 8.003 0 0012 21a8.003 8.003 0 003.657-6.343A7.963 7.963 0 0018 9c0-3.314-2.686-6-6-6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v4l2 2" />
        </svg>
    );
}

function IconCalcium() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-ocean-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    );
}

function IconNutrition() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-ocean-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
    );
}

// ─── Promo Carousel ───────────────────────────────────────────────────────────

const PROMOS = [
    {
        id: 1,
        badge: '🔥 Terbatas',
        badgeColor: '#C9A84C',
        label: 'Paket Hemat',
        title: 'Beli 2 Box',
        highlight: 'GRATIS ONGKIR',
        highlightColor: '#fde68a',
        desc: 'Berlaku ke seluruh Indonesia. Tanpa minimum berat.',
        bg: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 60%, #42a5f5 100%)',
        cta: 'Ambil Promo',
    },
    {
        id: 2,
        badge: '⚡ Flash Sale',
        badgeColor: '#ef4444',
        label: 'Pembelian Pertama',
        title: 'Diskon Spesial',
        highlight: '20% OFF',
        highlightColor: '#fde68a',
        desc: 'Khusus pelanggan baru. Berlaku hari ini saja.',
        bg: 'linear-gradient(135deg, #C9A84C 0%, #e6c06a 60%, #fde68a 100%)',
        cta: 'Belanja Sekarang',
    },
    {
        id: 3,
        badge: '🎁 Bonus',
        badgeColor: '#22c55e',
        label: 'Paket Keluarga',
        title: 'Beli 3 Box',
        highlight: '+1 SACHET GRATIS',
        highlightColor: '#fde68a',
        desc: 'Satu sachet ekstra untuk setiap pembelian 3 box.',
        bg: 'linear-gradient(135deg, #1565c0 0%, #1e88e5 60%, #64b5f6 100%)',
        cta: 'Dapatkan Bonus',
    },
];

function PromoCarousel({ onShop }) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = useCallback(() => setActive(i => (i + 1) % PROMOS.length), []);
    const prev = () => setActive(i => (i - 1 + PROMOS.length) % PROMOS.length);

    useEffect(() => {
        if (paused) return;
        const t = setInterval(next, 4000);
        return () => clearInterval(t);
    }, [paused, next]);

    const p = PROMOS[active];

    return (
        <section
            className="py-12 bg-white"
            aria-label="Promo spesial"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="max-w-4xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <span className="inline-block bg-gold-100 text-gold-700 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
                        🔥 Promo Spesial
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-ocean-900">
                        Penawaran Terbatas untuk Anda
                    </h2>
                </div>

                {/* Slide */}
                <div
                    className="relative rounded-3xl overflow-hidden shadow-2xl"
                    style={{ background: p.bg, minHeight: '220px', transition: 'background 0.5s ease' }}
                >
                    {/* Badge */}
                    <div
                        className="absolute top-5 left-5 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wide shadow"
                        style={{ background: p.badgeColor }}
                    >
                        {p.badge}
                    </div>

                    {/* Prev / Next arrows */}
                    <button
                        type="button"
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white z-10"
                        aria-label="Promo sebelumnya"
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white z-10"
                        aria-label="Promo berikutnya"
                    >
                        ›
                    </button>

                    {/* Content */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-16 py-10">
                        <div className="flex flex-col gap-2 text-center sm:text-left">
                            <p className="text-white/70 text-sm font-bold uppercase tracking-widest">{p.label}</p>
                            <h3 className="text-white text-3xl sm:text-4xl font-black leading-tight">{p.title}</h3>
                            <p className="text-4xl sm:text-5xl font-black leading-none" style={{ color: p.highlightColor }}>
                                {p.highlight}
                            </p>
                            <p className="text-white/70 text-sm mt-1">{p.desc}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onShop}
                            className="flex-shrink-0 bg-white font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform duration-150 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
                            style={{ color: '#0d47a1' }}
                        >
                            {p.cta} →
                        </button>
                    </div>
                </div>

                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mt-5">
                    {PROMOS.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setActive(i)}
                            className="rounded-full transition-all duration-300 focus:outline-none"
                            style={{
                                width: i === active ? '28px' : '10px',
                                height: '10px',
                                background: i === active ? '#1565c0' : '#bbdefb',
                            }}
                            aria-label={`Promo ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Features data ────────────────────────────────────────────────────────────

const FEATURES = [
    {
        id: 'digest',
        icon: <IconDigest />,
        title: 'Lebih Mudah Dicerna',
        description:
            'Protein susu kambing etawa memiliki struktur molekul yang lebih kecil sehingga lebih mudah diserap oleh sistem pencernaan, cocok untuk semua usia.',
    },
    {
        id: 'calcium',
        icon: <IconCalcium />,
        title: 'Tinggi Kalsium',
        description:
            'Kandungan kalsium yang tinggi mendukung kesehatan tulang dan gigi. Pilihan ideal untuk pertumbuhan anak dan menjaga kepadatan tulang orang dewasa.',
    },
    {
        id: 'nutrition',
        icon: <IconNutrition />,
        title: 'Kaya Nutrisi Alami',
        description:
            'Mengandung vitamin A, B2, dan mineral esensial yang mendukung imunitas tubuh, menjaga kesehatan kulit, dan meningkatkan vitalitas sehari-hari.',
    },
];

// ─── Home Page ────────────────────────────────────────────────────────────────

export default function Home() {
    const { products, loading, error } = useProducts();
    const { addItem } = useCart();

    // Fetch latest approved reviews for testimonials
    const [reviews, setReviews] = useState([]);
    useEffect(() => {
        getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(12)))
            .then(snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
            .catch(() => { }); // silently fail — testimonials are non-critical
    }, []);

    const scrollToProducts = () => {
        document.getElementById('produk')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <SEOHelmet
                title="Giarva — Susu Kambing Etawa Premium"
                description="Beli susu kambing etawa berkualitas tinggi dari Giarva. Lebih mudah dicerna, tinggi kalsium, dan kaya nutrisi alami untuk kesehatan keluarga Anda."
                keywords="susu kambing etawa, susu kambing, giarva"
                ogImage={heroImage}
            />

            {/* ── Hero Section ─────────────────────────────────────────────── */}
            <section
                className="relative flex items-end overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)',
                    minHeight: 'calc(100vh - 64px)'
                }}
                aria-label="Hero"
            >
                {/* Radial glow center-right */}
                <div
                    className="absolute top-0 right-0 w-[700px] h-[700px] pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.55) 0%, transparent 65%)' }}
                    aria-hidden="true"
                />
                {/* Subtle bottom glow */}
                <div
                    className="absolute bottom-0 left-0 w-full h-48 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(255,255,255,0.3) 0%, transparent 100%)' }}
                    aria-hidden="true"
                />

                {/* ── Main content ── */}
                <div className="relative z-10 w-full pb-16">
                    <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 items-end gap-0">

                        {/* Left — text */}
                        <div className="flex flex-col gap-6 order-2 lg:order-1 pb-8 lg:pb-0 pt-10 lg:pt-0">

                            {/* Headline */}
                            <div>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight"
                                    style={{ color: '#0d47a1' }}>
                                    Susu Etawa
                                </h1>
                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none tracking-tight"
                                    style={{ color: '#C9A84C', WebkitTextStroke: '1px #b08a2e' }}>
                                    Giarva
                                </h1>
                            </div>

                            <p className="text-lg font-bold text-ocean-800 uppercase tracking-[0.2em]">
                                Susu untuk Keluarga Sehat
                            </p>

                            <p className="text-base text-gray-700 leading-relaxed max-w-md">
                                Lebih mudah dicerna, tinggi kalsium, dan kaya nutrisi alami.
                                Dipercaya ribuan keluarga Indonesia untuk hidup yang lebih sehat setiap hari.
                            </p>

                            {/* CTA */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={scrollToProducts}
                                    className="bg-ocean-600 hover:bg-ocean-700 active:bg-ocean-800 text-white font-black px-10 py-4 rounded-2xl shadow-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                    style={{ boxShadow: '0 8px 32px rgba(21,101,192,0.35)' }}
                                >
                                    Beli Sekarang
                                </button>
                                <a
                                    href="#keunggulan"
                                    className="border-2 border-white/80 text-ocean-800 bg-white/40 hover:bg-white/70 font-bold px-8 py-4 rounded-2xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base text-center backdrop-blur-sm"
                                >
                                    Pelajari Lebih Lanjut
                                </a>
                            </div>

                            {/* Trust stats + badges */}
                            <div className="flex flex-wrap items-center gap-6 pt-2">
                                <div>
                                    <p className="text-3xl font-black text-ocean-800">1.000+</p>
                                    <p className="text-xs text-ocean-600 font-semibold uppercase tracking-wide">Pelanggan Puas</p>
                                </div>
                                <div className="w-px h-12 bg-ocean-300/60" />
                                <div>
                                    <p className="text-3xl font-black text-ocean-800">100%</p>
                                    <p className="text-xs text-ocean-600 font-semibold uppercase tracking-wide">Alami &amp; Premium</p>
                                </div>
                                <div className="w-px h-12 bg-ocean-300/60" />
                                {/* Halal & BPOM badges — di sini, sejajar dengan stats */}
                                <div className="flex items-center gap-2">
                                    <span className="bg-white/90 text-gold-600 text-xs font-black px-3 py-1.5 rounded-full tracking-widest uppercase shadow border border-gold-300">
                                        ✓ Halal
                                    </span>
                                    <span className="bg-white/90 text-ocean-700 text-xs font-black px-3 py-1.5 rounded-full tracking-widest uppercase shadow border border-ocean-300">
                                        Badan POM
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right — product image flush to bottom */}
                        <div className="flex justify-center lg:justify-end items-end order-1 lg:order-2 self-end">
                            <img
                                src={heroImage}
                                alt="Produk susu kambing etawa Giarva — untuk keluarga sehat"
                                className="w-full object-contain object-bottom select-none"
                                style={{
                                    maxWidth: '720px',
                                    height: 'clamp(460px, 78vh, 720px)',
                                    filter: 'drop-shadow(0 20px 60px rgba(13,71,161,0.25))',
                                }}
                                loading="eager"
                                draggable={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true">
                    <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
                        <path d="M0 80 C480 30 960 30 1440 80 L1440 80 L0 80 Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ── Promo Ticker ─────────────────────────────────────────────── */}
            <div className="bg-ocean-700 py-2.5 overflow-hidden" aria-label="Promo berjalan">
                <div className="animate-marquee">
                    {[
                        '🎉 GRATIS ONGKIR se-Indonesia min. pembelian 2 box',
                        '⚡ Flash Sale — diskon 20% untuk pembelian pertama',
                        '🎁 Beli 3 box gratis 1 sachet ekstra',
                        '✅ Produk 100% Halal & terdaftar Badan POM',
                        '🚚 Pengiriman same-day untuk area Jawa',
                        '💛 Lebih dari 1.000 keluarga sudah merasakan manfaatnya',
                        '🎉 GRATIS ONGKIR se-Indonesia min. pembelian 2 box',
                        '⚡ Flash Sale — diskon 20% untuk pembelian pertama',
                        '🎁 Beli 3 box gratis 1 sachet ekstra',
                        '✅ Produk 100% Halal & terdaftar Badan POM',
                        '🚚 Pengiriman same-day untuk area Jawa',
                        '💛 Lebih dari 1.000 keluarga sudah merasakan manfaatnya',
                    ].map((text, i) => (
                        <span key={i} className="text-white text-sm font-semibold whitespace-nowrap px-10 opacity-90">
                            {text}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Promo Carousel ────────────────────────────────────────────── */}
            <PromoCarousel onShop={scrollToProducts} />

            {/* ── Features Section ─────────────────────────────────────────── */}
            <section
                id="keunggulan"
                className="py-20 bg-white"
                aria-labelledby="features-heading"
            >
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2
                            id="features-heading"
                            className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4"
                        >
                            Mengapa Memilih Giarva?
                        </h2>
                        <p className="text-gray-500 text-lg max-w-xl mx-auto">
                            Susu kambing etawa Giarva diformulasikan untuk memberikan manfaat
                            kesehatan maksimal bagi seluruh anggota keluarga.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {FEATURES.map((feature) => (
                            <article
                                key={feature.id}
                                className="flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-ocean-50 hover:bg-ocean-100 transition-colors duration-200"
                            >
                                <div className="p-3 bg-white rounded-2xl shadow-sm">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed text-sm">
                                    {feature.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Product Listing Section ───────────────────────────────────── */}
            <section
                id="produk"
                className="py-20 bg-gray-50"
                aria-labelledby="products-heading"
            >
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2
                            id="products-heading"
                            className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4"
                        >
                            Produk Kami
                        </h2>
                        <p className="text-gray-500 text-lg max-w-xl mx-auto">
                            Pilih varian susu kambing etawa Giarva yang sesuai dengan kebutuhan
                            dan selera Anda.
                        </p>
                    </div>

                    {/* Loading state */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <LoadingSpinner size="lg" />
                            <p className="text-gray-500 text-sm">Memuat produk…</p>
                        </div>
                    )}

                    {/* Error state */}
                    {!loading && error && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <p className="text-red-500 font-medium">{error}</p>
                            <p className="text-gray-400 text-sm">
                                Silakan muat ulang halaman untuk mencoba lagi.
                            </p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && products.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                            <p className="text-gray-500 font-medium">
                                Belum ada produk tersedia saat ini.
                            </p>
                            <p className="text-gray-400 text-sm">
                                Silakan kunjungi kembali nanti.
                            </p>
                        </div>
                    )}

                    {/* Product grid */}
                    {!loading && !error && products.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onAddToCart={addItem}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Testimonials Section ─────────────────────────────────────── */}
            {reviews.length > 0 && (
                <section className="py-20 bg-white" aria-labelledby="testimonials-heading">
                    <div className="max-w-6xl mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
                                Kata Pelanggan Kami
                            </h2>
                            <p className="text-gray-500 text-lg max-w-xl mx-auto">
                                Ribuan keluarga sudah merasakan manfaat Susu Etawa Giarva.
                            </p>
                            {/* Average rating */}
                            {reviews.length > 0 && (() => {
                                const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
                                return (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <span className="text-3xl font-black text-yellow-500">{avg.toFixed(1)}</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <span key={s} className={`text-xl ${s <= Math.round(avg) ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                                            ))}
                                        </div>
                                        <span className="text-gray-400 text-sm">({reviews.length} ulasan)</span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reviews.map(review => (
                                <article key={review.id} className="bg-gray-50 rounded-2xl p-6 flex flex-col gap-3 border border-gray-100 hover:shadow-md transition-shadow">
                                    {/* Stars */}
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <span key={s} className={`text-lg ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                                        ))}
                                    </div>

                                    {/* Comment */}
                                    {review.comment && (
                                        <p className="text-gray-700 text-sm leading-relaxed italic">
                                            "{review.comment}"
                                        </p>
                                    )}

                                    {/* Reviewer */}
                                    <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-200">
                                        <div className="w-9 h-9 rounded-full bg-ocean-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                            {(review.userName || 'P').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{review.userName || 'Pelanggan'}</p>
                                            {review.productNames && (
                                                <p className="text-xs text-gray-400 truncate max-w-[160px]">{review.productNames}</p>
                                            )}
                                        </div>
                                        <span className="ml-auto text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                            ✓ Pembeli
                                        </span>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── CTA Banner ───────────────────────────────────────────────── */}
            <section className="py-16 bg-ocean-500" aria-label="Call to action">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Mulai Hidup Sehat Bersama Giarva
                    </h2>
                    <p className="text-ocean-100 text-lg mb-8">
                        Dapatkan susu kambing etawa premium langsung ke pintu rumah Anda.
                        Pengiriman cepat ke seluruh Indonesia.
                    </p>
                    <button
                        type="button"
                        onClick={scrollToProducts}
                        className="bg-white text-ocean-600 hover:bg-gold-50 font-semibold px-10 py-4 rounded-xl shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-ocean-500 text-base"
                    >
                        Lihat Semua Produk
                    </button>
                </div>
            </section>

            {/* ── Floating WhatsApp Button ──────────────────────────────────── */}
            <a
                href="https://wa.me/6285797522591?text=Halo%20Giarva%2C%20saya%20ingin%20memesan%20susu%20kambing%20etawa%20Giarva.%20Boleh%20info%20lebih%20lanjut%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="wa-float fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold px-5 py-4 rounded-full shadow-2xl transition-all duration-200 group"
                aria-label="Chat via WhatsApp"
            >
                {/* WA Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-7 h-7 fill-white flex-shrink-0" aria-hidden="true">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.472 2.027 7.774L0 32l8.476-2.004A15.93 15.93 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.77-1.853l-.485-.29-5.03 1.189 1.21-4.898-.317-.503A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.87c-.398-.199-2.354-1.162-2.72-1.294-.365-.133-.63-.199-.896.199-.265.398-1.029 1.294-1.261 1.56-.232.265-.465.298-.863.1-.398-.2-1.681-.62-3.202-1.977-1.183-1.056-1.982-2.36-2.214-2.758-.232-.398-.025-.613.174-.811.179-.178.398-.465.597-.697.199-.232.265-.398.398-.664.133-.265.066-.497-.033-.697-.1-.199-.896-2.16-1.228-2.957-.323-.776-.651-.671-.896-.683l-.763-.013c-.265 0-.697.1-1.062.497-.365.398-1.394 1.362-1.394 3.322s1.427 3.853 1.626 4.119c.199.265 2.808 4.287 6.803 6.014.951.41 1.693.655 2.271.839.954.304 1.823.261 2.51.158.766-.114 2.354-.962 2.686-1.891.332-.929.332-1.726.232-1.891-.099-.166-.365-.265-.763-.464z" />
                </svg>
                {/* Label — muncul saat hover */}
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm">
                    Pesan via WhatsApp
                </span>
            </a>
        </>
    );
}
