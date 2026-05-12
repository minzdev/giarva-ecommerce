import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import SEOHelmet from '../components/SEOHelmet';
import { useAuth } from '../hooks/useAuth';
import PasswordInput from '../components/PasswordInput';
import { useToast } from '../context/ToastContext';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn } = useAuth();
    const toast = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const from = location.state?.from?.pathname ?? '/';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);
        try {
            const credential = await signIn(email, password);
            // Check role — admin goes to /admin, customer goes to intended page
            const snap = await getDoc(doc(db, 'users', credential.user.uid));
            const role = snap.exists() ? snap.data().role : 'user';
            if (role === 'admin') {
                toast.success('Selamat datang, Admin!');
                navigate('/admin', { replace: true });
            } else {
                toast.success('Selamat datang kembali!');
                navigate(from, { replace: true });
            }
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass =
        'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 ' +
        'focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150';

    return (
        <>
            <SEOHelmet
                title="Masuk — Giarva"
                description="Masuk ke akun Giarva Anda untuk berbelanja produk susu kambing etawa."
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
                            <h1 className="text-2xl font-black text-gray-800">Masuk</h1>
                            <p className="text-sm text-gray-500 mt-1">Selamat datang kembali di Giarva</p>
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
                                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                                    Email <span className="text-red-500" aria-hidden="true">*</span>
                                </label>
                                <input id="email" type="email" name="email" value={email}
                                    onChange={(e) => { setEmail(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                    placeholder="contoh@email.com" autoComplete="email" required
                                    className={inputClass} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                                        Password <span className="text-red-500" aria-hidden="true">*</span>
                                    </label>
                                    <Link to="/forgot-password" className="text-xs text-ocean-600 hover:text-ocean-700 font-semibold hover:underline underline-offset-2 transition-colors">
                                        Lupa password?
                                    </Link>
                                </div>
                                <PasswordInput id="password" name="password" value={password}
                                    onChange={(e) => { setPassword(e.target.value); if (errorMessage) setErrorMessage(''); }}
                                    placeholder="Masukkan password Anda" autoComplete="current-password" required
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
                                ) : 'Masuk'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-500">
                            Belum punya akun?{' '}
                            <Link to="/register"
                                className="text-ocean-600 hover:text-ocean-700 font-bold underline-offset-2 hover:underline transition-colors duration-150">
                                Daftar sekarang
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}
