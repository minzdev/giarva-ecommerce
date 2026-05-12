import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import StarRating from './StarRating';
import LoadingSpinner from './LoadingSpinner';

/**
 * Hitung inisial dari nama user (maks 2 huruf, uppercase).
 * Contoh: "Budi Santoso" → "BS", "Rina" → "R"
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const trimmed = name.trim();
    if (!trimmed) return '?';
    return trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

/**
 * Format Firestore Timestamp atau Date ke string tanggal bahasa Indonesia.
 *
 * @param {import('firebase/firestore').Timestamp | Date | null} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * ReviewSystem — menampilkan daftar review produk dan form submit review.
 *
 * @param {{ productId: string }} props
 */
export default function ReviewSystem({ productId }) {
    const { user } = useAuth();

    // Data state
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');

    // ── Fetch reviews ──────────────────────────────────────────────────────────
    const fetchReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, 'reviews'),
                where('productId', '==', productId)
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setReviews(data);
        } catch (err) {
            setError('Gagal memuat ulasan. Silakan coba lagi.');
            console.error('[ReviewSystem] fetchReviews error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (productId) {
            fetchReviews();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    // ── Average rating ─────────────────────────────────────────────────────────
    const averageRating =
        reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

    // ── Submit review ──────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidationError('');

        // Validasi
        if (rating < 1) {
            setValidationError('Pilih rating terlebih dahulu');
            return;
        }
        if (comment.trim() === '') {
            setValidationError('Komentar tidak boleh kosong');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'reviews'), {
                productId,
                userId: user.uid,
                userName: user.displayName || user.email || 'Pengguna',
                rating,
                comment: comment.trim(),
                timestamp: Timestamp.now(),
            });

            // Reset form
            setRating(0);
            setComment('');

            // Re-fetch reviews
            await fetchReviews();
        } catch (err) {
            setError('Gagal mengirim ulasan. Silakan coba lagi.');
            console.error('[ReviewSystem] handleSubmit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <section aria-labelledby="review-heading" className="mt-10">
            <h2
                id="review-heading"
                className="text-2xl font-semibold text-gray-800 mb-4"
            >
                Ulasan Produk
            </h2>

            {/* Average rating summary */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                    {averageRating.toFixed(1)}
                </span>
                <div>
                    <StarRating rating={averageRating} size="md" />
                    <p className="text-sm text-gray-500 mt-0.5">
                        {reviews.length} ulasan
                    </p>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <p className="text-red-600 text-sm mb-4" role="alert">
                    {error}
                </p>
            )}

            {/* Review list */}
            {!loading && !error && (
                <ul className="space-y-6 mb-8" aria-label="Daftar ulasan">
                    {reviews.length === 0 ? (
                        <li className="text-gray-500 text-sm">
                            Belum ada ulasan untuk produk ini.
                        </li>
                    ) : (
                        reviews.map((review) => (
                            <li
                                key={review.id}
                                className="flex gap-4 border-b border-gray-100 pb-6 last:border-0"
                            >
                                {/* User initials avatar */}
                                <div
                                    aria-hidden="true"
                                    className="flex-shrink-0 w-10 h-10 rounded-full bg-ocean-500 flex items-center justify-center text-white font-semibold text-sm"
                                >
                                    {getInitials(review.userName)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-gray-800 text-sm">
                                            {review.userName}
                                        </span>
                                        <StarRating rating={review.rating} size="sm" />
                                    </div>
                                    <p className="text-gray-700 text-sm mt-1 break-words">
                                        {review.comment}
                                    </p>
                                    <time
                                        className="text-xs text-gray-400 mt-1 block"
                                        dateTime={(() => {
                                            if (!review.timestamp) return undefined;
                                            const d = review.timestamp.toDate
                                                ? review.timestamp.toDate()
                                                : new Date(review.timestamp);
                                            return isNaN(d.getTime()) ? undefined : d.toISOString();
                                        })()}
                                    >
                                        {formatDate(review.timestamp)}
                                    </time>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            )}

            {/* Submit review form — only for authenticated users */}
            {user !== null ? (
                <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Tulis Ulasan
                    </h3>
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Star rating selector */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rating
                            </label>
                            <StarRating
                                rating={rating}
                                interactive
                                onRate={setRating}
                                size="lg"
                            />
                        </div>

                        {/* Comment textarea */}
                        <div className="mb-4">
                            <label
                                htmlFor="review-comment"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Komentar
                            </label>
                            <textarea
                                id="review-comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={4}
                                placeholder="Bagikan pengalaman Anda dengan produk ini..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-transparent resize-none"
                                disabled={submitting}
                            />
                        </div>

                        {/* Validation error */}
                        {validationError && (
                            <p
                                className="text-red-600 text-sm mb-3"
                                role="alert"
                                aria-live="polite"
                            >
                                {validationError}
                            </p>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors duration-150"
                        >
                            {submitting && <LoadingSpinner size="sm" />}
                            {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                        </button>
                    </form>
                </div>
            ) : (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                    <a
                        href="/login"
                        className="text-ocean-600 font-medium hover:underline"
                    >
                        Login
                    </a>{' '}
                    untuk memberikan review.
                </p>
            )}
        </section>
    );
}
