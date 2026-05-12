/**
 * MidtransService - Client-side Midtrans Snap integration
 *
 * Architecture:
 *   Frontend  → Firebase Cloud Function → Midtrans API (create transaction token)
 *   Frontend  → Midtrans Snap popup (using token)
 *
 * The Server Key MUST stay on the backend (Cloud Function).
 * Only the Client Key is used here.
 */

const CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';

const SNAP_URL = IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

/**
 * Load Midtrans Snap.js script into the page (idempotent).
 * @returns {Promise<void>}
 */
export function loadSnapScript() {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (window.snap) {
            resolve();
            return;
        }

        const existing = document.getElementById('midtrans-snap');
        if (existing) {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
            return;
        }

        const script = document.createElement('script');
        script.id = 'midtrans-snap';
        script.src = SNAP_URL;
        script.setAttribute('data-client-key', CLIENT_KEY);
        script.onload = resolve;
        script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.'));
        document.head.appendChild(script);
    });
}

/**
 * Open Midtrans Snap payment popup.
 *
 * @param {string} snapToken - Token from backend (Cloud Function)
 * @param {Object} callbacks
 * @param {Function} callbacks.onSuccess  - Called with Midtrans result on success
 * @param {Function} callbacks.onPending  - Called with result when payment is pending
 * @param {Function} callbacks.onError    - Called with error array on failure
 * @param {Function} callbacks.onClose    - Called when user closes the popup
 * @returns {Promise<void>}
 */
export async function openSnapPayment(snapToken, { onSuccess, onPending, onError, onClose } = {}) {
    await loadSnapScript();

    window.snap.pay(snapToken, {
        onSuccess: (result) => {
            console.log('Midtrans payment success:', result);
            onSuccess?.(result);
        },
        onPending: (result) => {
            console.log('Midtrans payment pending:', result);
            onPending?.(result);
        },
        onError: (result) => {
            console.error('Midtrans payment error:', result);
            onError?.(result);
        },
        onClose: () => {
            console.log('Midtrans Snap closed by user');
            onClose?.();
        },
    });
}

/**
 * Build the Midtrans transaction payload from order data.
 * This is sent to the Cloud Function which calls Midtrans API.
 *
 * @param {Object} order - Order document data
 * @param {string} orderId - Firestore order document ID
 * @param {string} paymentMethodId - 'bank_transfer' | 'qris'
 * @returns {Object} Payload for Cloud Function
 */
export function buildTransactionPayload(order, orderId, paymentMethodId) {
    const payload = {
        orderId,
        grossAmount: order.totalAmount,
        customerDetails: {
            firstName: order.shippingAddress?.name || '',
            phone: order.shippingAddress?.phone || '',
        },
        itemDetails: order.items.map((item) => ({
            id: item.productId,
            name: item.name.substring(0, 50), // Midtrans max 50 chars
            price: item.price,
            quantity: item.quantity,
        })),
        // Add shipping cost as a line item
        ...(order.shippingCost > 0 && {
            shippingCostItem: {
                id: 'shipping',
                name: `Ongkos Kirim (${order.courier?.name || 'Kurir'})`,
                price: order.shippingCost,
                quantity: 1,
            },
        }),
    };

    // Payment method specific config
    if (paymentMethodId === 'bank_transfer') {
        payload.paymentType = 'bank_transfer';
        payload.enabledPayments = ['bca_va', 'bni_va', 'bri_va', 'mandiri_bill', 'permata_va'];
    } else if (paymentMethodId === 'qris') {
        payload.paymentType = 'qris';
        payload.enabledPayments = ['qris'];
    }

    return payload;
}
