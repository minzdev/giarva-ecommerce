import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';

export default function ForgotPassword() {
    const { sendPasswordReset } = useAuth();
    const toast = useToast();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        if (!email.trim()) {
            setErrorMessage('Masukkan alamat email kamu.');
            return;
        }
        setIsSubmitting(true);
        try {
            await sendPasswordReset(email.trim());
            setSent(true);
            toast.success('Link reset password sudah dikirim ke email kamu!');
        } catch (error) {
            setErrorMessage(error.message);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <SEOHelmet title="Lupa Password — Giarva" description="Reset password akun Giarva kamu." />

            <main className="min-h-screen flex items-center justify-center px-4 py-12"
                style={{ background: 'linear-gradient(160deg, #e3f2fd 0%, #bbdefb 60%, #e3f2fd 100%)' }}>
                <div className="w-full max-w-md">
                    {/* Brand */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black" style={{ color: '#0d47a1' }}>Giarva</h2>
                        <p className="text-ocean-600 text-sm font-semibold mt-1 uppercase tracking-widest">
                            Susu Etawa Premium
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        {sent ? (
                            /* ── Success state ── */
                            <div className="flex flex-col items-center gap-5 text-center py-4">
                                <div className="w-16 h-16 rounded-full bg-ocean-100 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-ocean-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-gray-800 mb-2">Email Terkirim!</h1>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        Link reset password sudah dikirim ke <span className="font-semibold text-gray-700">{email}</span>.
                                        Cek inbox atau folder spam kamu.
                                    </p>
                                </div>
                                <Link to="/login"
                                    className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-colors text-center"
                                    style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                    Kembali ke Login
                                </Link>
                            </div>
                        ) : (
                            /* ── Form state ── */
                            <>
                                <div className="mb-7 text-center">
                                    <h1 className="text-2xl font-black text-gray-800">Lupa Password?</h1>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        Masukkan email kamu dan kami akan kirimkan link untuk reset password.
                                    </p>
                                </div>

                                {errorMessage && (
                                    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                        {errorMessage}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                            Email <span className="text-red-500" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="email" type="email" value={email}
                                            onChange={(e) => { setEmail(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                            placeholder="contoh@email.com" autoComplete="email" required
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150"
                                        />
                                    </div>

                                    <button type="submit" disabled={isSubmitting}
                                        className="w-full bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                        style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Mengirim…
                                            </span>
                                        ) : 'Kirim Link Reset'}
                                    </button>
                                </form>

                                <p className="mt-6 text-center text-sm text-gray-500">
                                    Ingat password?{' '}
                                    <Link to="/login" className="text-ocean-600 hover:text-ocean-700 font-bold hover:underline underline-offset-2 transition-colors">
                                        Masuk sekarang
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
