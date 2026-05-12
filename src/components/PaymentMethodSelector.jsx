import { useState, useEffect } from 'react';
import { getPaymentMethods } from '../services/PaymentService';

/**
 * PaymentMethodSelector Component
 *
 * Displays Midtrans payment options: Transfer Bank/VA and QRIS.
 * Both methods have no additional fee.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3
 */
export default function PaymentMethodSelector({ onPaymentSelect, selectedMethod, orderTotal }) {
    const [paymentMethods, setPaymentMethods] = useState([]);

    useEffect(() => {
        setPaymentMethods(getPaymentMethods());
    }, []);

    const handlePaymentSelect = (method) => {
        onPaymentSelect({ ...method, calculatedFee: 0 });
    };

    return (
        <div className="payment-method-selector">
            <h3 className="text-lg font-semibold mb-4">Pilih Metode Pembayaran</h3>

            <div className="space-y-3">
                {paymentMethods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;

                    return (
                        <button
                            key={method.id}
                            onClick={() => handlePaymentSelect(method)}
                            className={`
                                w-full text-left p-4 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                }
                            `}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${method.name} - ${method.description}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* Radio indicator */}
                                        <div className={`
                                            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                                            ${isSelected ? 'border-blue-600' : 'border-gray-300'}
                                        `}>
                                            {isSelected && (
                                                <div className="w-3 h-3 rounded-full bg-blue-600" />
                                            )}
                                        </div>

                                        {/* Icon */}
                                        <span className="text-2xl" role="img" aria-label={method.name}>
                                            {method.icon}
                                        </span>

                                        <div>
                                            <h4 className="font-semibold text-gray-900">{method.name}</h4>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-600 ml-11">{method.description}</p>

                                    {/* Provider chips */}
                                    {method.providers?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2 ml-11">
                                            {method.providers.map((p) => (
                                                <span
                                                    key={p}
                                                    className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                                >
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Free fee badge */}
                                    <div className="mt-2 ml-11">
                                        <span className="text-sm text-green-600 font-medium">✓ Gratis biaya admin</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
