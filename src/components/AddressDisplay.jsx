import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Validates shipping address completeness and format
 * @param {Object} address - Shipping address object
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateAddress(address) {
    const errors = [];

    if (!address?.displayName?.trim()) {
        errors.push('Nama penerima belum diisi');
    }

    if (!address?.phone?.trim()) {
        errors.push('Nomor telepon belum diisi');
    } else if (!/^[0-9+\-\s]{7,15}$/.test(address.phone.trim())) {
        errors.push('Format nomor telepon tidak valid');
    }

    if (!address?.address?.trim()) {
        errors.push('Alamat lengkap belum diisi');
    }

    if (!address?.city?.trim()) {
        errors.push('Kota belum diisi');
    }

    if (!address?.postalCode?.trim()) {
        errors.push('Kode pos belum diisi');
    } else if (!/^\d{5}$/.test(address.postalCode.trim())) {
        errors.push('Kode pos harus 5 digit angka');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * AddressDisplay Component
 * Displays user's saved shipping address as read-only information with validation
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.address - Shipping address object with displayName, phone, address, city, postalCode
 * @param {string} [props.className] - Additional CSS classes
 */
export default function AddressDisplay({ address, className = '' }) {
    const validation = validateAddress(address);
    const hasAddress = address && Object.keys(address).length > 0;

    return (
        <div className={`bg-white rounded-3xl shadow-sm p-6 flex flex-col gap-5 ${className}`}>
            <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-800 text-lg flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-ocean-600 text-white text-xs font-black flex items-center justify-center">
                        1
                    </span>
                    Alamat Pengiriman
                </h2>
                <Link
                    to="/profile"
                    className="text-xs font-bold text-ocean-600 hover:text-ocean-700 transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                    Edit Alamat
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </Link>
            </div>

            {!hasAddress || !validation.isValid ? (
                <div
                    role="alert"
                    className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-4 py-3 text-sm"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                    </svg>
                    <div className="flex-1">
                        <p className="font-bold mb-1">Alamat pengiriman belum lengkap</p>
                        {validation.errors.length > 0 && (
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                {validation.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-2 text-xs">
                            Silakan{' '}
                            <Link
                                to="/profile"
                                className="font-bold underline hover:text-amber-900"
                            >
                                lengkapi alamat di profil
                            </Link>
                            {' '}untuk melanjutkan checkout.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Nama Penerima
                        </span>
                        <span className="text-sm text-gray-800 font-medium">
                            {address.displayName}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Nomor Telepon
                        </span>
                        <span className="text-sm text-gray-800 font-medium">
                            {address.phone}
                        </span>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Alamat Lengkap
                        </span>
                        <span className="text-sm text-gray-800 font-medium">
                            {address.address}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Kota
                            </span>
                            <span className="text-sm text-gray-800 font-medium">
                                {address.city}
                            </span>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                Kode Pos
                            </span>
                            <span className="text-sm text-gray-800 font-medium">
                                {address.postalCode}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

AddressDisplay.propTypes = {
    address: PropTypes.shape({
        displayName: PropTypes.string,
        phone: PropTypes.string,
        address: PropTypes.string,
        city: PropTypes.string,
        postalCode: PropTypes.string,
    }),
    className: PropTypes.string,
};
