/**
 * PaymentService - Handles payment method configuration and fee calculation
 *
 * Payment gateway: Midtrans
 * Available methods:
 *   1. bank_transfer — Transfer Bank / Virtual Account (BCA, BNI, BRI, Mandiri, Permata)
 *   2. qris          — QRIS (GoPay, OVO, Dana, ShopeePay, dll via satu QR code)
 *
 * Both methods have no additional fee charged to the customer.
 */

/**
 * Get all available payment methods with their details.
 * @returns {Array} Array of payment method objects
 */
export function getPaymentMethods() {
    return [
        {
            id: 'bank_transfer',
            name: 'Transfer Bank / VA',
            type: 'bank_transfer',
            icon: '🏦',
            description: 'Bayar via Virtual Account BCA, BNI, BRI, Mandiri, atau Permata',
            providers: ['BCA', 'BNI', 'BRI', 'Mandiri', 'Permata'],
            fee: 0
        },
        {
            id: 'qris',
            name: 'QRIS',
            type: 'qris',
            icon: '📱',
            description: 'Scan QR code dengan GoPay, OVO, Dana, ShopeePay, atau m-banking',
            providers: ['GoPay', 'OVO', 'Dana', 'ShopeePay', 'LinkAja'],
            fee: 0
        }
    ];
}

/**
 * Calculate payment fee based on payment method and order total.
 * Both Midtrans methods (bank_transfer & qris) have no customer-facing fee.
 *
 * @param {string} paymentMethodId - The ID of the selected payment method
 * @param {number} orderTotal - The order total amount before payment fees
 * @returns {number} The calculated payment fee (always 0)
 */
export function calculatePaymentFee(paymentMethodId, orderTotal) {
    // No additional fee for any supported payment method
    return 0;
}
