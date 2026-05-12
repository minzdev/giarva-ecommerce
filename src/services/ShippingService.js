/**
 * ShippingService - Utility for shipping cost calculation and courier management
 * 
 * This service provides functions for:
 * - Calculating order weight from cart items
 * - Getting available courier options based on weight and destination
 * - Calculating shipping costs based on courier, destination, and weight
 */

/**
 * Store origin: Lenteng Agung, Jakarta Selatan (12610)
 * 
 * GoSend coverage area (radius ~40km from origin) based on postal code prefix:
 * - Jakarta:          10xxx – 14xxx  (Jakarta Pusat, Utara, Barat, Selatan, Timur)
 * - Depok:            16xxx
 * - Tangerang/Banten: 15xxx          (Tangerang Kota & Kab, Tangerang Selatan)
 * - Bekasi:           17xxx          (Bekasi Kota & Kab)
 * - Bogor:            16xxx shared with Depok, also 161xx-168xx
 *
 * Prefixes outside this range are considered beyond GoSend radius.
 */
const GOSEND_COVERAGE_PREFIXES = new Set([
    '10', '11', '12', '13', '14', // Jakarta (all 5 municipalities)
    '15',                          // Tangerang / Tangerang Selatan
    '16',                          // Depok & Bogor Kota
    '17',                          // Bekasi
]);

/**
 * Check whether a destination postal code is within GoSend coverage area (~40km radius).
 * @param {string} postalCode - 5-digit destination postal code
 * @returns {boolean}
 */
export function isGoSendCoverage(postalCode) {
    if (!postalCode || postalCode.length < 2) return false;
    return GOSEND_COVERAGE_PREFIXES.has(postalCode.substring(0, 2));
}

/**
 * Calculate total order weight from cart items
 * 
 * @param {Array} cartItems - Array of cart items with productId, quantity, and optional weight
 * @param {Object} products - Object mapping productId to product data (including weight)
 * @returns {number} Total weight in kilograms
 * 
 * Requirements: 8.1, 11.3
 */
export function calculateOrderWeight(cartItems, products = {}) {
    if (!cartItems || cartItems.length === 0) {
        return 0;
    }

    return cartItems.reduce((total, item) => {
        // Look up product weight from products collection
        // Default to 0.25kg (250g) if weight not specified
        const productWeight = products[item.productId]?.weight || item.weight || 0.25;
        return total + (productWeight * item.quantity);
    }, 0);
}

/**
 * Get available courier options based on destination and order weight
 * 
 * GoSend Same Day & Instant are only available within ~40km radius of the store
 * (Jabodetabek area). For destinations outside this radius only regular/cargo
 * couriers are shown.
 * 
 * @param {string} postalCode - Destination postal code (5 digits)
 * @param {string} city - Destination city name
 * @param {number} weight - Order weight in kilograms
 * @returns {Array} Array of available courier options
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 11.1, 11.2, 12.1, 12.2, 12.6
 */
export function getAvailableCouriers(postalCode, city, weight) {
    const couriers = [];

    // Regular couriers for orders < 20kg
    if (weight < 20) {
        couriers.push(
            {
                id: 'jne-reg',
                name: 'JNE',
                serviceType: 'regular',
                estimatedDelivery: '2-3 hari',
                description: 'Pengiriman reguler JNE'
            },
            {
                id: 'jnt-reg',
                name: 'J&T',
                serviceType: 'regular',
                estimatedDelivery: '2-3 hari',
                description: 'Pengiriman reguler J&T'
            },
            {
                id: 'wahana-reg',
                name: 'Wahana',
                serviceType: 'regular',
                estimatedDelivery: '3-4 hari',
                description: 'Pengiriman reguler Wahana'
            }
        );
    }

    // Cargo courier for orders >= 20kg
    if (weight >= 20) {
        couriers.push({
            id: 'wahana-cargo',
            name: 'Wahana Cargo',
            serviceType: 'cargo',
            estimatedDelivery: '4-7 hari',
            description: 'Pengiriman kargo untuk pesanan berat'
        });
    }

    // GoSend Same Day & Instant — only available within Jabodetabek (~40km radius)
    if (isGoSendCoverage(postalCode)) {
        couriers.push(
            {
                id: 'gosend-same',
                name: 'GoSend Same Day',
                serviceType: 'same-day',
                estimatedDelivery: 'Hari ini',
                description: 'Pengiriman di hari yang sama (area Jabodetabek)'
            },
            {
                id: 'gosend-instant',
                name: 'GoSend Instant',
                serviceType: 'instant',
                estimatedDelivery: '2-4 jam',
                description: 'Pengiriman instan dalam beberapa jam (area Jabodetabek)'
            }
        );
    }

    return couriers;
}

/**
 * Get distance multiplier based on postal code prefix
 * 
 * @param {string} postalCode - 5-digit postal code
 * @returns {number} Distance multiplier (1.0 - 2.0)
 */
function getDistanceMultiplier(postalCode) {
    if (!postalCode || postalCode.length < 2) {
        return 1.5; // Default multiplier for invalid postal codes
    }

    const prefix = postalCode.substring(0, 2);

    // Jakarta area (10xxx-14xxx)
    if (prefix >= '10' && prefix <= '14') {
        return 1.0;
    }

    // Nearby cities (15xxx-19xxx, 40xxx-42xxx)
    if ((prefix >= '15' && prefix <= '19') || (prefix >= '40' && prefix <= '42')) {
        return 1.3;
    }

    // Other Java (20xxx-69xxx)
    if (prefix >= '20' && prefix <= '69') {
        return 1.5;
    }

    // Outside Java
    return 2.0;
}

/**
 * Calculate shipping cost for selected courier
 * 
 * @param {Object} courier - Courier object with id, name, serviceType
 * @param {Object} destination - Destination object with postalCode and city
 * @param {number} weight - Order weight in kilograms
 * @returns {number} Shipping cost in Rupiah
 * 
 * Requirements: 8.3, 8.4
 */
export function calculateShippingCost(courier, destination, weight) {
    if (!courier || !destination || !weight) {
        return 0;
    }

    // Base rates per kg for each courier
    const baseRates = {
        'jne-reg': 10000,
        'jnt-reg': 9000,
        'wahana-reg': 8500,
        'wahana-cargo': 7000,
        'gosend-same': 15000,
        'gosend-instant': 25000
    };

    // Get base rate for the selected courier
    const baseRate = baseRates[courier.id] || 10000;

    // Calculate distance multiplier based on postal code
    const distanceMultiplier = getDistanceMultiplier(destination.postalCode);

    // Calculate weight-based cost (round up weight to nearest kg)
    const weightCost = Math.ceil(weight) * baseRate;

    // Apply distance multiplier and round to nearest Rupiah
    return Math.round(weightCost * distanceMultiplier);
}
