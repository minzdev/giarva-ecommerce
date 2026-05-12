import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import SEOHelmet from '../components/SEOHelmet';
import LoadingSpinner from '../components/LoadingSpinner';
import PasswordInput from '../components/PasswordInput';
import { useToast } from '../context/ToastContext';

export default function Profile() {
    const { user, changePassword } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSaved, setPwSaved] = useState(false);
    const [pwError, setPwError] = useState('');

    const [form, setForm] = useState({
        displayName: '', phone: '', address: '', city: '', postalCode: '',
    });

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setForm({
                        displayName: d.displayName || user.displayName || '',
                        phone: d.phone || '',
                        address: d.address || '',
                        city: d.city || '',
                        postalCode: d.postalCode || '',
                    });
                } else {
                    setForm(f => ({ ...f, displayName: user.displayName || '' }));
                }
            } catch {
                setErrorMessage('Gagal memuat data profil.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        if (errorMessage) setErrorMessage('');
        if (saved) setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.displayName.trim()) { setErrorMessage('Nama lengkap wajib diisi.'); return; }
        if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) {
            setErrorMessage('Format nomor HP tidak valid. Contoh: 08123456789'); return;
        }
        if (form.postalCode && !/^\d{5}$/.test(form.postalCode.trim())) {
            setErrorMessage('Kode pos harus 5 digit angka.'); return;
        }
        setSaving(true);
        setErrorMessage('');
        try {
            await setDoc(doc(db, 'users', user.uid), {
                displayName: form.displayName.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                postalCode: form.postalCode.trim(),
                email: user.email,
                updatedAt: new Date(),
            }, { merge: true });
            setSaved(true);
            toast.success('Profil berhasil disimpan!');
        } catch {
            setErrorMessage('Gagal menyimpan profil. Coba lagi.');
            toast.error('Gagal menyimpan profil.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwError('');
        setPwSaved(false);
        if (!pwForm.current) { setPwError('Masukkan password saat ini.'); return; }
        if (pwForm.newPw.length < 6) { setPwError('Password baru minimal 6 karakter.'); return; }
        if (pwForm.newPw !== pwForm.confirm) { setPwError('Konfirmasi password tidak cocok.'); return; }
        setPwSaving(true);
        try {
            await changePassword(pwForm.current, pwForm.newPw);
            setPwSaved(true);
            setPwForm({ current: '', newPw: '', confirm: '' });
            toast.success('Password berhasil diubah!');
        } catch (err) {
            setPwError(err.message);
            toast.error(err.message);
        } finally {
            setPwSaving(false);
        }
    };

    const inputClass =
        'w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 ' +
        'focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150';

    const SpinIcon = () => (
        <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
    );

    return (
        <>
            <SEOHelmet title="Profil Saya — Giarva" description="Kelola profil dan alamat pengiriman Anda." />

            <main className="min-h-screen bg-gray-50 py-10">
                <div className="max-w-2xl mx-auto px-4 sm:px-6">
                    <div className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-black text-ocean-900">Profil Saya</h1>
                        <p className="text-gray-500 text-sm mt-1">Data ini akan digunakan otomatis saat checkout.</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <>
                            {/* ── Profil Card ── */}
                            <div className="bg-white rounded-3xl shadow-sm p-8">
                                {/* Avatar */}
                                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                                    <div className="w-16 h-16 rounded-full bg-ocean-100 flex items-center justify-center text-ocean-700 text-2xl font-black select-none">
                                        {(form.displayName || user?.email || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">{form.displayName || 'Pengguna'}</p>
                                        <p className="text-sm text-gray-500">{user?.email}</p>
                                    </div>
                                </div>

                                {saved && (
                                    <div role="status" className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Profil berhasil disimpan!
                                    </div>
                                )}
                                {errorMessage && (
                                    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                        {errorMessage}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="displayName" className="text-sm font-semibold text-gray-700">
                                            Nama Lengkap <span className="text-red-500" aria-hidden="true">*</span>
                                        </label>
                                        <input id="displayName" name="displayName" type="text"
                                            value={form.displayName} onChange={handleChange}
                                            placeholder="Nama lengkap Anda" autoComplete="name" required
                                            className={inputClass} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-semibold text-gray-700">Email</label>
                                        <input type="email" value={user?.email || ''} readOnly
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                                        <p className="text-xs text-gray-400">Email tidak dapat diubah.</p>
                                    </div>

                                    <hr className="border-gray-100" />
                                    <p className="text-sm font-black text-ocean-700 uppercase tracking-widest">Alamat Pengiriman</p>

                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="phone" className="text-sm font-semibold text-gray-700">Nomor HP</label>
                                        <input id="phone" name="phone" type="tel"
                                            value={form.phone} onChange={handleChange}
                                            placeholder="Contoh: 08123456789" autoComplete="tel"
                                            className={inputClass} />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="address" className="text-sm font-semibold text-gray-700">Alamat Lengkap</label>
                                        <textarea id="address" name="address"
                                            value={form.address} onChange={handleChange}
                                            placeholder="Jalan, nomor rumah, RT/RW, kelurahan"
                                            rows={3} className={inputClass} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="city" className="text-sm font-semibold text-gray-700">Kota / Kabupaten</label>
                                            <input id="city" name="city" type="text"
                                                value={form.city} onChange={handleChange}
                                                placeholder="Jakarta Selatan"
                                                className={inputClass} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label htmlFor="postalCode" className="text-sm font-semibold text-gray-700">Kode Pos</label>
                                            <input id="postalCode" name="postalCode" type="text"
                                                value={form.postalCode} onChange={handleChange}
                                                placeholder="12345"
                                                className={inputClass} />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={saving}
                                        className="mt-2 w-full bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                        style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                        {saving
                                            ? <span className="flex items-center justify-center gap-2"><SpinIcon /> Menyimpan…</span>
                                            : 'Simpan Profil'}
                                    </button>
                                </form>
                            </div>

                            {/* ── Ganti Password Card ── */}
                            <div className="bg-white rounded-3xl shadow-sm p-8 mt-6">
                                <h2 className="text-lg font-black text-ocean-900 mb-1">Ganti Password</h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Masukkan password saat ini untuk verifikasi, lalu buat password baru.
                                </p>

                                {pwSaved && (
                                    <div role="status" className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        Password berhasil diubah!
                                    </div>
                                )}
                                {pwError && (
                                    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                        </svg>
                                        {pwError}
                                    </div>
                                )}

                                <form onSubmit={handleChangePassword} noValidate className="flex flex-col gap-4">
                                    {[
                                        { id: 'current', label: 'Password Saat Ini', placeholder: 'Masukkan password saat ini' },
                                        { id: 'newPw', label: 'Password Baru', placeholder: 'Minimal 6 karakter' },
                                        { id: 'confirm', label: 'Konfirmasi Password Baru', placeholder: 'Ulangi password baru' },
                                    ].map(({ id, label, placeholder }) => (
                                        <div key={id} className="flex flex-col gap-1">
                                            <label htmlFor={`pw-${id}`} className="text-sm font-semibold text-gray-700">{label}</label>
                                            <PasswordInput
                                                id={`pw-${id}`}
                                                value={pwForm[id]}
                                                onChange={(e) => {
                                                    setPwForm(f => ({ ...f, [id]: e.target.value }));
                                                    if (pwError) setPwError('');
                                                    if (pwSaved) setPwSaved(false);
                                                }}
                                                placeholder={placeholder}
                                                autoComplete={id === 'current' ? 'current-password' : 'new-password'}
                                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400 transition-colors duration-150"
                                            />
                                        </div>
                                    ))}
                                    <button type="submit" disabled={pwSaving}
                                        className="mt-1 w-full bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                        style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                                        {pwSaving
                                            ? <span className="flex items-center justify-center gap-2"><SpinIcon /> Menyimpan…</span>
                                            : 'Ubah Password'}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
