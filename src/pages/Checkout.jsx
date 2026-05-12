import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import SEOHelmet from '../components/SEOHelmet';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import AddressDisplay, { validateAddress } from '../components/AddressDisplay';
import CourierSelector from '../components/CourierSelector';
import PaymentMethodSelector from '../components/PaymentMethodSelector';
import { calculateOrderWeight } from '../services/ShippingService';
import { openSnapPayment } from '../services/MidtransService';

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Order Success ─────────────────────────────────────────────────────────────
function OrderSuccess({ orderId, onContinue }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800">Pesanan Berhasil! 🎉</h2>
                <p className="text-gray-500 text-sm mt-2 max-w-sm">
                    Terima kasih telah berbelanja di Giarva. Pesanan kamu sedang diproses.
                </p>
                {orderId && (
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                        ID: <span className="font-semibold text-gray-600">{orderId.slice(0, 16).toUpperCase()}</span>
                    </p>
                )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={onContinue}
                    className="bg-ocean-600 hover:bg-ocean-700 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-colors text-sm uppercase tracking-widest"
                    style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.25)' }}>
                    Lanjut Belanja
                </button>
                <Link to="/orders"
                    className="border-2 border-ocean-300 text-ocean-600 hover:bg-ocean-50 font-bold px-8 py-3 rounded-xl transition-colors text-sm text-center">
                    Lihat Pesanan
                </Link>
            </div>
        </div>
    );
}

// ── Checkout Page ─────────────────────────────────────────────────────────────
export default function Checkout() {
    const navigate = useNavigate();
    const { items, totalAmount, clearCart } = useCart();
    const { user } = useAuth();
    const toast = useToast();

    // Profile address state
    const [profileAddress, setProfileAddress] = useState(null);
    const [addressValidation, setAddressValidation] = useState({ isValid: false, errors: [] });
    const [addressLoading, setAddressLoading] = useState(true);

    // Order weight and courier state
    const [orderWeight, setOrderWeight] = useState(0);
    const [selectedCourier, setSelectedCourier] = useState(null);
    const [shippingCost, setShippingCost] = useState(0);

    // Payment state
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentFee, setPaymentFee] = useState(0);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Load profile address on mount (Task 8.2)
    useEffect(() => {
        if (!user) {
            setAddressLoading(false);
            return;
        }

        const loadProfileAddress = async () => {
            try {
                setAddressLoading(true);
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const address = {
                        displayName: userData.displayName || '',
                        phone: userData.phone || '',
                        address: userData.address || '',
                        city: userData.city || '',
                        postalCode: userData.postalCode || ''
                    };

                    setProfileAddress(address);

                    // Validate address completeness
                    const validation = validateAddress(address);
                    setAddressValidation(validation);
                } else {
                    // User document doesn't exist, create empty address
                    const emptyAddress = {
                        displayName: user.displayName || '',
                        phone: '',
                        address: '',
                        city: '',
                        postalCode: ''
                    };
                    setProfileAddress(emptyAddress);
                    setAddressValidation({ isValid: false, errors: ['Profil belum lengkap'] });
                }
            } catch (error) {
                console.error('Error loading profile address:', error);
                setErrorMessage('Gagal memuat alamat profil. Periksa koneksi internet dan muat ulang halaman.');
                setAddressValidation({ isValid: false, errors: ['Gagal memuat alamat'] });
            } finally {
                setAddressLoading(false);
            }
        };

        loadProfileAddress();
    }, [user]);

    // Calculate order weight on mount (Task 8.4)
    useEffect(() => {
        if (items.length > 0) {
            // Create products map from cart items (weight defaults to 0.25kg/250g if not specified)
            const productsMap = items.reduce((acc, item) => {
                acc[item.productId] = { weight: item.weight || 0.25 };
                return acc;
            }, {});

            const weight = calculateOrderWeight(items, productsMap);
            setOrderWeight(weight);
        }
    }, [items]);

    // Handle courier selection (Task 8.4)
    const handleCourierSelect = (courier) => {
        setSelectedCourier(courier);
        setShippingCost(courier.cost || 0);
    };

    // Handle payment method selection (Task 8.5)
    const handlePaymentSelect = (paymentMethod) => {
        setSelectedPayment(paymentMethod);
        setPaymentFee(0); // Both Midtrans methods (VA & QRIS) have no customer fee
    };

    // Calculate subtotal (sum of item prices)
    const subtotal = totalAmount;

    // Calculate final total
    const finalTotal = subtotal + shippingCost + paymentFee;

    // Check if submit button should be enabled (Task 8.3, 8.6)
    const canSubmit = addressValidation.isValid && selectedCourier && selectedPayment && !isSubmitting;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Final validation
        if (!addressValidation.isValid) {
            setErrorMessage('Alamat pengiriman belum lengkap. Silakan lengkapi di profil.');
            return;
        }

        if (!selectedCourier) {
            setErrorMessage('Silakan pilih kurir pengiriman.');
            return;
        }

        if (!selectedPayment) {
            setErrorMessage('Silakan pilih metode pembayaran.');
            return;
        }

        if (items.length === 0) {
            setErrorMessage('Keranjang kosong.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            // 1. Build order data — sanitize all fields to avoid undefined in Firestore
            const orderData = {
                userId: user?.uid || null,
                items: items.map((item) => ({
                    productId: item.productId || '',
                    name: item.name || '',
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 1,
                    weight: Number(item.weight) || 0.25,
                })),
                subtotal: subtotal,
                orderWeight: orderWeight,
                courier: {
                    id: selectedCourier.id || '',
                    name: selectedCourier.name || '',
                    serviceType: selectedCourier.serviceType || '',
                    estimatedDelivery: selectedCourier.estimatedDelivery || '',
                },
                shippingCost: shippingCost,
                paymentMethod: {
                    id: selectedPayment.id || '',
                    name: selectedPayment.name || '',
                    type: selectedPayment.type || '',
                },
                paymentFee: 0,
                totalAmount: finalTotal,
                status: 'pending_payment',
                shippingAddress: {
                    name: (profileAddress.displayName || '').trim(),
                    phone: (profileAddress.phone || '').trim(),
                    address: (profileAddress.address || '').trim(),
                    city: (profileAddress.city || '').trim(),
                    postalCode: (profileAddress.postalCode || '').trim(),
                },
                timestamp: serverTimestamp(),
            };

            // 2. Save order to Firestore
            const ref = await addDoc(collection(db, 'orders'), orderData);
            const newOrderId = ref.id;

            // 3. Get Midtrans Snap token from Vercel API (Server Key stays on backend)
            const itemDetails = orderData.items.map((item) => ({
                id: item.productId,
                name: item.name.substring(0, 50),
                price: item.price,
                quantity: item.quantity,
            }));
            if (orderData.shippingCost > 0) {
                itemDetails.push({
                    id: 'shipping',
                    name: `Ongkos Kirim (${orderData.courier.name})`,
                    price: orderData.shippingCost,
                    quantity: 1,
                });
            }

            const apiRes = await fetch('/.netlify/functions/create-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: newOrderId,
                    grossAmount: finalTotal,
                    customerDetails: {
                        firstName: orderData.shippingAddress.name,
                        phone: orderData.shippingAddress.phone,
                    },
                    itemDetails,
                    paymentMethodId: selectedPayment.id,
                }),
            });

            if (!apiRes.ok) {
                const errData = await apiRes.json().catch(() => ({}));
                throw new Error(errData.message || 'Gagal membuat transaksi pembayaran.');
            }

            const { token } = await apiRes.json();

            // 4. Open Midtrans Snap popup
            // Note: callbacks run inside Snap iframe context — keep them synchronous
            // and use fire-and-forget for Firestore updates to avoid postMessage issues
            openSnapPayment(token, {
                onSuccess: (result) => {
                    // Fire-and-forget Firestore update
                    updateDoc(doc(db, 'orders', newOrderId), {
                        status: 'paid',
                        midtransOrderId: result.order_id || newOrderId,
                        paidAt: serverTimestamp(),
                    }).catch(console.error);

                    clearCart();
                    setOrderId(newOrderId);
                    setOrderSuccess(true);
                    setIsSubmitting(false);
                    toast.success('Pembayaran berhasil! Pesanan sedang diproses.');
                },
                onPending: (result) => {
                    // Payment pending (VA/QRIS waiting for payment)
                    updateDoc(doc(db, 'orders', newOrderId), {
                        status: 'pending',
                        midtransOrderId: result.order_id || newOrderId,
                    }).catch(console.error);

                    clearCart();
                    setOrderId(newOrderId);
                    setOrderSuccess(true);
                    setIsSubmitting(false);
                    toast.success('Pesanan dibuat! Selesaikan pembayaran sesuai instruksi.');
                },
                onError: () => {
                    setErrorMessage('Pembayaran gagal. Silakan coba lagi atau pilih metode lain.');
                    setIsSubmitting(false);
                },
                onClose: () => {
                    // User closed without paying — order stays as pending_payment
                    // Show info so they can pay later from Orders page
                    clearCart();
                    setOrderId(newOrderId);
                    setOrderSuccess(true);
                    setIsSubmitting(false);
                    toast.success('Pesanan tersimpan. Selesaikan pembayaran dari halaman Pesanan.');
                },
            });
        } catch (error) {
            console.error('Error creating order:', error);
            setErrorMessage(error.message || 'Gagal menyimpan pesanan. Periksa koneksi dan coba lagi.');
            toast.error('Gagal membuat pesanan. Coba lagi.');
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <SEOHelmet title="Checkout — Giarva" description="Selesaikan pembelian produk susu kambing etawa Giarva." />

            <main className="min-h-screen py-10" style={{ background: 'linear-gradient(160deg, #f0f4f7 0%, #e3f2fd 100%)' }}>
                <div className="max-w-5xl mx-auto px-4 sm:px-6">

                    {orderSuccess ? (
                        <div className="bg-white rounded-3xl shadow-sm p-8">
                            <OrderSuccess orderId={orderId} onContinue={() => navigate('/')} />
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <h1 className="text-2xl sm:text-3xl font-black text-ocean-900">Checkout</h1>
                                <p className="text-gray-500 text-sm mt-1">Lengkapi data pengiriman untuk menyelesaikan pesanan.</p>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6 items-start">

                                {/* Left — Address, Courier, Payment */}
                                <div className="flex-1 flex flex-col gap-4">
                                    {errorMessage && (
                                        <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                            </svg>
                                            {errorMessage}
                                        </div>
                                    )}

                                    {/* Address Display Component (Task 8.2) */}
                                    {addressLoading ? (
                                        <div className="bg-white rounded-3xl shadow-sm p-6">
                                            <div className="flex items-center justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
                                                <span className="ml-3 text-gray-600">Memuat alamat...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <AddressDisplay address={profileAddress} />
                                    )}

                                    {/* Courier Selector Component (Task 8.4) */}
                                    {addressValidation.isValid && profileAddress && (
                                        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5">
                                            <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full bg-ocean-600 text-white text-xs font-black flex items-center justify-center">
                                                    2
                                                </span>
                                                Pilih Kurir
                                            </h2>
                                            <CourierSelector
                                                destination={{
                                                    city: profileAddress.city,
                                                    postalCode: profileAddress.postalCode
                                                }}
                                                orderWeight={orderWeight}
                                                onCourierSelect={handleCourierSelect}
                                                selectedCourier={selectedCourier}
                                            />
                                        </div>
                                    )}

                                    {/* Payment Method Selector Component (Task 8.5) */}
                                    {addressValidation.isValid && selectedCourier && (
                                        <div className="bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5">
                                            <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
                                                <span className="w-7 h-7 rounded-full bg-ocean-600 text-white text-xs font-black flex items-center justify-center">
                                                    3
                                                </span>
                                                Metode Pembayaran
                                            </h2>
                                            <PaymentMethodSelector
                                                onPaymentSelect={handlePaymentSelect}
                                                selectedMethod={selectedPayment}
                                                orderTotal={subtotal}
                                            />
                                        </div>
                                    )}

                                    {/* Submit Button (Task 8.6) */}
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={!canSubmit}
                                        className="w-full bg-ocean-600 hover:bg-ocean-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ocean-400 focus:ring-offset-2 text-base uppercase tracking-widest"
                                        style={{ boxShadow: '0 8px 24px rgba(21,101,192,0.3)' }}
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Memproses Pesanan…
                                            </span>
                                        ) : 'Buat Pesanan →'}
                                    </button>
                                </div>

                                {/* Right — Order summary */}
                                <aside className="w-full lg:w-80 flex flex-col gap-4 lg:sticky lg:top-24">
                                    <div className="bg-white rounded-3xl shadow-sm p-6">
                                        <h2 className="font-black text-gray-800 text-lg flex items-center gap-2 mb-4">
                                            <span className="w-7 h-7 rounded-full bg-ocean-600 text-white text-xs font-black flex items-center justify-center">4</span>
                                            Ringkasan Pesanan
                                        </h2>

                                        {items.length === 0 ? (
                                            <p className="text-gray-400 text-sm text-center py-4">Keranjang kosong.</p>
                                        ) : (
                                            <>
                                                <ul className="flex flex-col gap-3 mb-4">
                                                    {items.map(item => (
                                                        <li key={item.productId} className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                                                                {item.imageUrl && (
                                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-gray-700 truncate">{item.name}</p>
                                                                <p className="text-xs text-gray-400">{fmt(item.price)} × {item.quantity}</p>
                                                            </div>
                                                            <p className="text-xs font-black text-gray-800 flex-shrink-0">{fmt(item.price * item.quantity)}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="h-px bg-gray-100 mb-4" />

                                                {/* Subtotal */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Subtotal</span>
                                                    <span className="text-sm font-bold text-gray-800">{fmt(subtotal)}</span>
                                                </div>

                                                {/* Shipping Cost */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Ongkos Kirim</span>
                                                    <span className="text-sm font-bold text-gray-800">{fmt(shippingCost)}</span>
                                                </div>

                                                {/* Payment Fee */}
                                                {paymentFee > 0 && (
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-sm text-gray-600">Biaya Pembayaran</span>
                                                        <span className="text-sm font-bold text-gray-800">{fmt(paymentFee)}</span>
                                                    </div>
                                                )}

                                                <div className="h-px bg-gray-100 my-3" />

                                                {/* Final Total */}
                                                <div className="flex justify-between items-center">
                                                    <span className="font-black text-gray-800">Total</span>
                                                    <span className="font-black text-ocean-600 text-xl">{fmt(finalTotal)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Trust */}
                                    <div className="bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-3">
                                        {[
                                            { icon: '🔒', text: 'Data kamu aman & terenkripsi' },
                                            { icon: '📦', text: 'Dikemas dengan aman' },
                                            { icon: '✅', text: 'Produk 100% original & halal' },
                                        ].map(({ icon, text }) => (
                                            <div key={text} className="flex items-center gap-3 text-sm text-gray-500">
                                                <span>{icon}</span><span>{text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </aside>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
