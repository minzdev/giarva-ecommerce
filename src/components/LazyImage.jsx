import { useState, useEffect, useRef } from 'react';

/**
 * LazyImage — gambar dengan lazy loading via IntersectionObserver.
 *
 * State machine:
 *   Idle → Loading (enters viewport) → Loaded (onLoad) | Error (onError)
 *
 * Props:
 *   src            {string}  URL gambar utama
 *   alt            {string}  Teks alternatif gambar
 *   className      {string?} Class tambahan untuk elemen <img>
 *   fallbackSrc    {string?} URL gambar fallback jika src gagal dimuat
 *   placeholderColor {string?} Tailwind bg-* class untuk placeholder (default: bg-gray-200)
 */
function LazyImage({ src, alt, className = '', fallbackSrc, placeholderColor }) {
    // 'idle' | 'loading' | 'loaded' | 'error'
    const [status, setStatus] = useState('idle');
    const containerRef = useRef(null);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    // Gambar mendekati viewport — mulai loading
                    setStatus('loading');
                    // Tidak perlu observe lagi setelah loading dimulai
                    observer.disconnect();
                }
            },
            {
                // Mulai load sedikit sebelum masuk viewport
                rootMargin: '200px',
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleLoad = () => {
        setStatus('loaded');
    };

    const handleError = () => {
        setStatus('error');
    };

    const placeholderClass = placeholderColor ?? 'bg-gray-200';

    // Idle atau Loading: tampilkan placeholder + img tersembunyi (agar onLoad/onError terpicu)
    if (status === 'idle') {
        return (
            <div
                ref={containerRef}
                className={`${placeholderClass} animate-pulse ${className}`}
                aria-label={alt}
                role="img"
            />
        );
    }

    if (status === 'loading') {
        return (
            <div ref={containerRef} className={`relative ${className}`}>
                <div
                    className={`absolute inset-0 ${placeholderClass} animate-pulse`}
                    aria-hidden="true"
                />
                <img
                    src={src}
                    alt={alt}
                    className={`relative z-10 ${className}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{ opacity: 0 }}
                    ref={el => {
                        if (el && el.complete) {
                            if (el.naturalWidth > 0) handleLoad();
                            else handleError();
                        }
                    }}
                />
            </div>
        );
    }

    if (status === 'error') {
        if (fallbackSrc) {
            return (
                <img
                    ref={containerRef}
                    src={fallbackSrc}
                    alt={alt}
                    className={className}
                />
            );
        }
        // Tidak ada fallbackSrc — tampilkan placeholder dengan ikon
        return (
            <div
                ref={containerRef}
                className={`${placeholderClass} ${className} flex items-center justify-center`}
                aria-label={alt}
                role="img"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    // status === 'loaded'
    return (
        <img
            ref={containerRef}
            src={src}
            alt={alt}
            className={className}
            style={{ animation: 'fadeIn 0.3s ease' }}
        />
    );
}

export default LazyImage;
