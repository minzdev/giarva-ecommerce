import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEOHelmet from '../components/SEOHelmet';
import { useAuth } from '../hooks/useAuth';
import PasswordInput from '../components/PasswordInput';
import { useToast } from '../context/ToastContext';

export default function Register() {
    const navigate = useNavigate();
    const { signUp } = useAuth();
    const toast = useToast();

    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (password !== confirmPassword) {
            setErrorMessage('Password dan konfirmasi password tidak sama.');
            return;
        }

        setIsSubmitting(true);
        try {
            await signUp(email, password, displayName);
            toast.success('Akun berhasil dibuat! Selamat datang di Giarva.');
            navigate('/', { replace: true });
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearError = () => { if (errorMessage) setErrorMessage(''); };

    const inputClass =
        'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 ' +
        'focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150';

    return (
        <>
            <SEOHelmet
                title="Daftar — Giarva"
                description="Buat akun Giarva baru untuk mulai berbelanja produk susu kambing etawa."
            />

            <main className="min-h-screen flex items-center justify-center px-4 py-12"
                style={{ background: 'linear-gradient(160deg, #e3f2fd 0%, #bbdefb 60%, #e3f2fd 100%)' }}>
                <div className="w-full max-w-md">
                    {/* Brand */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black" style={{ color: '#0d47a1' }}>
                            Giarva
                        </h2>
                        <p className="text-ocean-600 text-sm font-semibold mt-1 uppercase tracking-widest">
                            Susu Etawa Premium
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        <div className="mb-7 text-center">
                            <h1 className="text-2xl font-black text-gray-800">Daftar</h1>
                            <p className="text-sm text-gray-500 mt-1">Buat akun baru di Giarva</p>
                        </div>

                        {/* Error banner */}
                        {errorMessage && (
                            <div role="alert" aria-live="assertive"
                                className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1">
                                <label htmlFor="displayName" className="text-sm font-semibold text-gray-700">
                                    Nama Lengkap <span className="text-red-500" aria-hidden="true">*</span>
                                </label>
                                <input id="displayName" type="text" name="displayName" value={displayName}
                                    onChange={(e) => { setDisplayName(e.target.value); clearError(); }}
                                    placeholder="Nama lengkap Anda" autoComplete="name" required
                                    className={inputClass} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                    Email <span className="text-red-500" aria-hidden="true">*</span>
                                </label>
                                <input id="email" type="email" name="email" value={email}
                                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                                    placeholder="contoh@email.com" autoComplete="email" required
                                    className={inputClass} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                    Password <span className="text-red-500" aria-hidden="true">*</span>
                                </label>
                                <PasswordInput id="password" name="password" value={password}
                                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                                    placeholder="Minimal 6 karakter" autoComplete="new-password" required
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150" />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                                    Konfirmasi Password <span className="text-red-500" aria-hidden="true">*</span>
                                </label>
                                <PasswordInput id="confirmPassword" name="confirmPassword" value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                                    placeholder="Ulangi password Anda" autoComplete="new-password" required
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150" />
                            </div>

                            <button type="submit" disabled={isSubmitting}
                                className="mt-1 w-full bg-ocean-600 hover:bg-ocean-700 active:bg-ocean-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.3)' }}>
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Memproses…
                                    </span>
                                ) : 'Daftar'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Sudah punya akun?{' '}
                            <Link to="/login"
                                className="text-ocean-600 hover:text-ocean-700 font-bold underline-offset-2 hover:underline transition-colors duration-150">
                                Masuk sekarang
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}
