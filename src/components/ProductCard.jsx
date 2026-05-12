import { useState, useEffect } from 'react';
import LazyImage from './LazyImage';
import { useToast } from '../context/ToastContext';

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-semibold flex items-center gap-1 focus:outline-none"
                    aria-label="Tutup"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Tutup
                </button>
                <img
                    src={src}
                    alt={alt}
                    className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-white"
                />
            </div>
        </div>
    );
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }) {
    const { name, price, imageUrl, description } = product;
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const toast = useToast();

    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(price);

    return (
        <>
            <article className="bg-white rounded-2xl shadow-md overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl flex flex-col">
                {/* Gambar produk — klik untuk lightbox */}
                <button
                    type="button"
                    onClick={() => imageUrl && setLightboxOpen(true)}
                    className="relative group overflow-hidden bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ocean-400"
                    style={{ height: '280px' }}
                    aria-label={`Lihat foto ${name} lebih besar`}
                    disabled={!imageUrl}
                >
                    <LazyImage
                        src={imageUrl}
                        alt={name}
                        className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                        placeholderColor="bg-gray-100"
                    />
                    {/* Zoom hint overlay */}
                    {imageUrl && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                                Perbesar
                            </span>
                        </div>
                    )}
                </button>

                {/* Konten kartu */}
                <div className="p-5 flex flex-col flex-1 gap-2">
                    <h3 className="text-base font-bold text-gray-800 leading-snug">
                        {name}
                    </h3>
                    <p className="text-ocean-600 font-black text-xl">
                        {formattedPrice}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1">
                        {description}
                    </p>
                    <button
                        type="button"
                        onClick={() => { onAddToCart(product); toast.success(`${name} ditambahkan ke keranjang!`); }}
                        className="mt-2 w-full bg-ocean-500 hover:bg-ocean-600 active:bg-ocean-700 text-white font-bold py-3 px-4 rounded-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-sm"
                        aria-label={`Tambah ${name} ke keranjang`}
                    >
                        Tambah ke Keranjang
                    </button>
                </div>
            </article>

            {lightboxOpen && (
                <Lightbox src={imageUrl} alt={name} onClose={() => setLightboxOpen(false)} />
            )}
        </>
    );
}

export default ProductCard;
