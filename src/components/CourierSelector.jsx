import { useState, useEffect } from 'react';
import { getAvailableCouriers, calculateShippingCost, isGoSendCoverage } from '../services/ShippingService';

/**
 * CourierSelector Component
 * 
 * Displays available courier options and handles courier selection.
 * Automatically calculates shipping costs and updates parent component.
 * 
 * Requirements: 9.1, 9.5, 9.6, 10.1, 10.2, 10.3, 11.5
 */
export default function CourierSelector({ destination, orderWeight, onCourierSelect, selectedCourier }) {
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch available couriers when destination or weight changes
        if (destination?.postalCode && destination?.city && orderWeight > 0) {
            fetchCouriers();
        }
    }, [destination?.postalCode, destination?.city, orderWeight]);

    useEffect(() => {
        // Auto-select if only one courier option is available (Requirement 11.5)
        if (couriers.length === 1 && !selectedCourier) {
            handleCourierSelect(couriers[0]);
        }
    }, [couriers, selectedCourier]);

    const fetchCouriers = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get available couriers based on destination and weight
            const availableCouriers = getAvailableCouriers(
                destination.postalCode,
                destination.city,
                orderWeight
            );

            // Calculate shipping cost for each courier
            const couriersWithCost = availableCouriers.map(courier => ({
                ...courier,
                cost: calculateShippingCost(courier, destination, orderWeight)
            }));

            setCouriers(couriersWithCost);
        } catch (err) {
            console.error('Error fetching couriers:', err);
            setError('Gagal memuat opsi pengiriman. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const handleCourierSelect = (courier) => {
        // Update parent component with selected courier (Requirement 10.2)
        onCourierSelect(courier);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="courier-selector">
                <h3 className="text-lg font-semibold mb-4">Pilih Kurir</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Memuat opsi pengiriman...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="courier-selector">
                <h3 className="text-lg font-semibold mb-4">Pilih Kurir</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={fetchCouriers}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        );
    }

    if (couriers.length === 0) {
        return (
            <div className="courier-selector">
                <h3 className="text-lg font-semibold mb-4">Pilih Kurir</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                        Maaf, belum ada layanan pengiriman tersedia untuk alamat Anda.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="courier-selector">
            <h3 className="text-lg font-semibold mb-4">
                Pilih Kurir
                <span className="text-sm font-normal text-gray-600 ml-2">
                    (Berat pesanan: {orderWeight.toFixed(1)} kg)
                </span>
            </h3>

            <div className="space-y-3">
                {couriers.map((courier) => {
                    const isSelected = selectedCourier?.id === courier.id;

                    return (
                        <button
                            key={courier.id}
                            onClick={() => handleCourierSelect(courier)}
                            className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                                }
              `}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${courier.name} - ${formatCurrency(courier.cost)} - ${courier.estimatedDelivery}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        {/* Radio button indicator */}
                                        <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? 'border-blue-600' : 'border-gray-300'}
                    `}>
                                            {isSelected && (
                                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                            )}
                                        </div>

                                        <h4 className="font-semibold text-gray-900">
                                            {courier.name}
                                        </h4>

                                        {/* Service type badge */}
                                        <span className={`
                      px-2 py-0.5 text-xs rounded-full
                      ${courier.serviceType === 'instant' ? 'bg-red-100 text-red-700' :
                                                courier.serviceType === 'same-day' ? 'bg-orange-100 text-orange-700' :
                                                    courier.serviceType === 'cargo' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-700'}
                    `}>
                                            {courier.serviceType === 'instant' ? 'Instan' :
                                                courier.serviceType === 'same-day' ? 'Same Day' :
                                                    courier.serviceType === 'cargo' ? 'Kargo' :
                                                        'Reguler'}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-600 ml-7">
                                        {courier.description}
                                    </p>

                                    <div className="flex items-center gap-4 mt-2 ml-7">
                                        <div className="flex items-center gap-1 text-sm text-gray-700">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{courier.estimatedDelivery}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right ml-4">
                                    <p className={`font-bold ${isSelected ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {formatCurrency(courier.cost)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {couriers.length === 1 && (
                <p className="mt-3 text-sm text-gray-600 italic">
                    * Kurir dipilih otomatis karena hanya ada satu opsi tersedia
                </p>
            )}

            {/* Notice when GoSend is not available for this destination */}
            {!isGoSendCoverage(destination?.postalCode) && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        GoSend Same Day & Instant tidak tersedia untuk alamat ini.
                        Layanan GoSend hanya menjangkau area <strong>Jabodetabek</strong> (radius ~40km dari toko).
                    </span>
                </div>
            )}
        </div>
    );
}
