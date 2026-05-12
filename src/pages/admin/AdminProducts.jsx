import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { uploadToCloudinary } from '../../services/cloudinary';
import LoadingSpinner from '../../components/LoadingSpinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

const formatRupiah = (n) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const EMPTY = { name: '', description: '', price: '', imageUrl: '', category: '', stock: '', weight: '0.25' };

function ProductForm({ initial, onSave, onCancel }) {
    const [form, setForm] = useState(initial || EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(initial?.imageUrl || '');

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleImageFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('File harus berupa gambar.'); return; }
        if (file.size > 5 * 1024 * 1024) { setError('Ukuran gambar maksimal 5MB.'); return; }

        setUploading(true);
        setError('');
        setPreviewUrl(URL.createObjectURL(file));
        try {
            const url = await uploadToCloudinary(file, setUploadProgress);
            setForm(f => ({ ...f, imageUrl: url }));
            setPreviewUrl(url);
        } catch (err) {
            setError(err.message);
            setPreviewUrl('');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.name.trim() || !form.price) { setError('Nama dan harga wajib diisi.'); return; }
        setSaving(true);
        try {
            await onSave({
                name: form.name.trim(),
                description: form.description.trim(),
                price: Number(form.price),
                imageUrl: form.imageUrl.trim(),
                category: form.category.trim(),
                stock: Number(form.stock) || 0,
                weight: Number(form.weight) || 0.25,
            });
        } catch { setError('Gagal menyimpan produk.'); }
        finally { setSaving(false); }
    };

    const inputClass = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:border-ocean-400';

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Nama Produk *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Nama produk" className={inputClass} required />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Harga (Rp) *</label>
                    <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="75000" className={inputClass} required />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Kategori</label>
                    <input name="category" value={form.category} onChange={handleChange} placeholder="original / vanilla / chocolate" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Stok</label>
                    <input name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="100" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-600">Berat (kg)</label>
                    <input name="weight" type="number" step="0.01" min="0.01" value={form.weight} onChange={handleChange} placeholder="0.25" className={inputClass} />
                </div>

                {/* Image upload */}
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Foto Produk</label>
                    <div className="flex items-start gap-4">
                        {/* Preview */}
                        <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors ${uploading ? 'border-ocean-200 text-ocean-400 cursor-not-allowed' : 'border-ocean-300 text-ocean-600 hover:bg-ocean-50'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {uploading ? `Mengupload... ${uploadProgress}%` : 'Upload Foto'}
                                <input type="file" accept="image/*" onChange={handleImageFile} disabled={uploading} className="hidden" />
                            </label>
                            {uploading && (
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div className="bg-ocean-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            )}
                            <p className="text-xs text-gray-400">JPG, PNG, WebP. Maks 5MB.</p>
                            {/* Or paste URL */}
                            <input name="imageUrl" value={form.imageUrl} onChange={e => { handleChange(e); setPreviewUrl(e.target.value); }}
                                placeholder="Atau paste URL gambar..." className={`${inputClass} text-xs`} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Deskripsi</label>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Deskripsi produk..." className={inputClass} />
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
                <button type="submit" disabled={saving || uploading}
                    className="px-5 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-sm font-black disabled:opacity-60">
                    {saving ? 'Menyimpan…' : 'Simpan'}
                </button>
            </div>
        </form>
    );
}

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // product to confirm delete
    const toast = useToast();

    const load = async () => {
        const snap = await getDocs(collection(db, 'products'));
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async (data) => {
        await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() });
        setShowForm(false);
        toast.success('Produk berhasil ditambahkan!');
        load();
    };

    const handleEdit = async (data) => {
        await updateDoc(doc(db, 'products', editProduct.id), data);
        setEditProduct(null);
        toast.success('Produk berhasil diperbarui!');
        load();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(deleteTarget.id);
        await deleteDoc(doc(db, 'products', deleteTarget.id));
        setProducts(p => p.filter(x => x.id !== deleteTarget.id));
        toast.success(`Produk "${deleteTarget.name}" berhasil dihapus.`);
        setDeleting(null);
        setDeleteTarget(null);
    };

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-800">Manajemen Produk</h1>
                    <p className="text-gray-400 text-sm mt-1">{products.length} produk</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditProduct(null); }}
                    className="bg-ocean-600 hover:bg-ocean-700 text-white font-black px-5 py-2.5 rounded-xl text-sm shadow-md transition-colors">
                    + Tambah Produk
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="font-black text-gray-800 mb-4">Tambah Produk Baru</h2>
                    <ProductForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {/* Products table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-3 text-left">Produk</th>
                                <th className="px-6 py-3 text-left">Harga</th>
                                <th className="px-6 py-3 text-left">Berat</th>
                                <th className="px-6 py-3 text-left">Stok</th>
                                <th className="px-6 py-3 text-left">Kategori</th>
                                <th className="px-6 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.map(p => (
                                <>
                                    <tr key={p.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />}
                                                <span className="font-semibold text-gray-800">{p.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-ocean-700">{formatRupiah(p.price)}</td>
                                        <td className="px-6 py-4 text-gray-600">{p.weight ? `${p.weight} kg` : '1 kg'}</td>
                                        <td className="px-6 py-4 text-gray-600">{p.stock ?? '-'}</td>
                                        <td className="px-6 py-4 text-gray-500">{p.category || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setEditProduct(p); setShowForm(false); }}
                                                    className="text-xs font-bold text-ocean-600 hover:text-ocean-700 px-3 py-1.5 rounded-lg hover:bg-ocean-50 transition-colors">
                                                    Edit
                                                </button>
                                                <button onClick={() => setDeleteTarget(p)} disabled={deleting === p.id}
                                                    className="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                                    {deleting === p.id ? '…' : 'Hapus'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {editProduct?.id === p.id && (
                                        <tr key={`edit-${p.id}`}>
                                            <td colSpan={6} className="px-6 py-4 bg-ocean-50 border-t border-ocean-100">
                                                <p className="font-black text-gray-800 mb-4">Edit Produk</p>
                                                <ProductForm initial={editProduct} onSave={handleEdit} onCancel={() => setEditProduct(null)} />
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                    {products.length === 0 && <p className="text-center text-gray-400 py-10 text-sm">Belum ada produk.</p>}
                </div>
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Produk?"
                message={`Produk "${deleteTarget?.name}" akan dihapus permanen dan tidak bisa dikembalikan.`}
                confirmLabel="Ya, Hapus"
                cancelLabel="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
