import { describe, it, expect } from 'vitest';
import {
    calculateOrderWeight,
    getAvailableCouriers,
    calculateShippingCost
} from './ShippingService';

describe('ShippingService', () => {
    describe('calculateOrderWeight', () => {
        it('should calculate total weight from cart items with product weights', () => {
            const cartItems = [
                { productId: 'p1', quantity: 2 },
                { productId: 'p2', quantity: 3 }
            ];
            const products = {
                p1: { weight: 1.5 },
                p2: { weight: 2.0 }
            };

            const result = calculateOrderWeight(cartItems, products);
            expect(result).toBe(9); // (1.5 * 2) + (2.0 * 3) = 3 + 6 = 9
        });

        it('should default to 1kg per item when weight is missing', () => {
            const cartItems = [
                { productId: 'p1', quantity: 2 },
                { productId: 'p2', quantity: 3 }
            ];
            const products = {
                p1: {}, // No weight field
                p2: {} // No weight field
            };

            const result = calculateOrderWeight(cartItems, products);
            expect(result).toBe(5); // (1 * 2) + (1 * 3) = 5
        });

        it('should use item weight if product weight is not available', () => {
            const cartItems = [
                { productId: 'p1', quantity: 2, weight: 0.5 },
                { productId: 'p2', quantity: 1, weight: 3.0 }
            ];
            const products = {};

            const result = calculateOrderWeight(cartItems, products);
            expect(result).toBe(4); // (0.5 * 2) + (3.0 * 1) = 4
        });

        it('should return 0 for empty cart', () => {
            const result = calculateOrderWeight([], {});
            expect(result).toBe(0);
        });

        it('should return 0 for null or undefined cart', () => {
            expect(calculateOrderWeight(null, {})).toBe(0);
            expect(calculateOrderWeight(undefined, {})).toBe(0);
        });

        it('should handle mixed weight sources correctly', () => {
            const cartItems = [
                { productId: 'p1', quantity: 2, weight: 0.5 }, // Has item weight
                { productId: 'p2', quantity: 1 }, // No weight anywhere
                { productId: 'p3', quantity: 3 } // Has product weight
            ];
            const products = {
                p1: { weight: 2.0 }, // Product weight should take precedence
                p3: { weight: 1.5 }
            };

            const result = calculateOrderWeight(cartItems, products);
            expect(result).toBe(9.5); // (2.0 * 2) + (1 * 1) + (1.5 * 3) = 4 + 1 + 4.5 = 9.5
        });
    });

    describe('getAvailableCouriers', () => {
        it('should return regular couriers for orders < 20kg', () => {
            const couriers = getAvailableCouriers('12345', 'Jakarta', 15);

            expect(couriers).toHaveLength(5); // JNE, JNT, Wahana, GoSend Same, GoSend Instant
            expect(couriers.map(c => c.id)).toContain('jne-reg');
            expect(couriers.map(c => c.id)).toContain('jnt-reg');
            expect(couriers.map(c => c.id)).toContain('wahana-reg');
            expect(couriers.map(c => c.id)).toContain('gosend-same');
            expect(couriers.map(c => c.id)).toContain('gosend-instant');
        });

        it('should return cargo courier for orders >= 20kg', () => {
            const couriers = getAvailableCouriers('12345', 'Jakarta', 25);

            expect(couriers.map(c => c.id)).toContain('wahana-cargo');
            expect(couriers.map(c => c.id)).not.toContain('jne-reg');
            expect(couriers.map(c => c.id)).not.toContain('jnt-reg');
            expect(couriers.map(c => c.id)).not.toContain('wahana-reg');
        });

        it('should always include GoSend options regardless of weight', () => {
            const lightOrder = getAvailableCouriers('12345', 'Jakarta', 5);
            const heavyOrder = getAvailableCouriers('12345', 'Jakarta', 30);

            expect(lightOrder.map(c => c.id)).toContain('gosend-same');
            expect(lightOrder.map(c => c.id)).toContain('gosend-instant');
            expect(heavyOrder.map(c => c.id)).toContain('gosend-same');
            expect(heavyOrder.map(c => c.id)).toContain('gosend-instant');
        });

        it('should return exactly 3 couriers for heavy orders (cargo + 2 GoSend)', () => {
            const couriers = getAvailableCouriers('12345', 'Jakarta', 20);

            expect(couriers).toHaveLength(3);
            expect(couriers.map(c => c.id)).toEqual([
                'wahana-cargo',
                'gosend-same',
                'gosend-instant'
            ]);
        });

        it('should include all required courier properties', () => {
            const couriers = getAvailableCouriers('12345', 'Jakarta', 10);

            couriers.forEach(courier => {
                expect(courier).toHaveProperty('id');
                expect(courier).toHaveProperty('name');
                expect(courier).toHaveProperty('serviceType');
                expect(courier).toHaveProperty('estimatedDelivery');
                expect(courier).toHaveProperty('description');
            });
        });

        it('should handle edge case at exactly 20kg boundary', () => {
            const at19kg = getAvailableCouriers('12345', 'Jakarta', 19.9);
            const at20kg = getAvailableCouriers('12345', 'Jakarta', 20);

            expect(at19kg.map(c => c.id)).toContain('jne-reg');
            expect(at19kg.map(c => c.id)).not.toContain('wahana-cargo');

            expect(at20kg.map(c => c.id)).not.toContain('jne-reg');
            expect(at20kg.map(c => c.id)).toContain('wahana-cargo');
        });
    });

    describe('calculateShippingCost', () => {
        it('should calculate cost for JNE to Jakarta area', () => {
            const courier = { id: 'jne-reg', name: 'JNE', serviceType: 'regular' };
            const destination = { postalCode: '12345', city: 'Jakarta' };
            const weight = 5;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(50000); // 5kg * 10000 * 1.0 = 50000
        });

        it('should calculate cost for JNT to nearby cities', () => {
            const courier = { id: 'jnt-reg', name: 'J&T', serviceType: 'regular' };
            const destination = { postalCode: '16000', city: 'Bogor' };
            const weight = 3;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(35100); // 3kg * 9000 * 1.3 = 35100
        });

        it('should calculate cost for Wahana to other Java areas', () => {
            const courier = { id: 'wahana-reg', name: 'Wahana', serviceType: 'regular' };
            const destination = { postalCode: '50000', city: 'Semarang' };
            const weight = 2;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(25500); // 2kg * 8500 * 1.5 = 25500
        });

        it('should calculate cost for cargo to outside Java', () => {
            const courier = { id: 'wahana-cargo', name: 'Wahana Cargo', serviceType: 'cargo' };
            const destination = { postalCode: '80000', city: 'Denpasar' };
            const weight = 25;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(350000); // 25kg * 7000 * 2.0 = 350000
        });

        it('should calculate higher cost for GoSend same-day', () => {
            const courier = { id: 'gosend-same', name: 'GoSend Same Day', serviceType: 'same-day' };
            const destination = { postalCode: '12345', city: 'Jakarta' };
            const weight = 3;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(45000); // 3kg * 15000 * 1.0 = 45000
        });

        it('should calculate highest cost for GoSend instant', () => {
            const courier = { id: 'gosend-instant', name: 'GoSend Instant', serviceType: 'instant' };
            const destination = { postalCode: '12345', city: 'Jakarta' };
            const weight = 2;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(50000); // 2kg * 25000 * 1.0 = 50000
        });

        it('should round up weight to nearest kg', () => {
            const courier = { id: 'jne-reg', name: 'JNE', serviceType: 'regular' };
            const destination = { postalCode: '12345', city: 'Jakarta' };
            const weight = 2.3;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(30000); // Math.ceil(2.3) = 3kg * 10000 * 1.0 = 30000
        });

        it('should apply correct distance multipliers for different postal code ranges', () => {
            const courier = { id: 'jne-reg', name: 'JNE', serviceType: 'regular' };
            const weight = 1;

            // Jakarta area (1.0x)
            const jakarta = calculateShippingCost(courier, { postalCode: '11000', city: 'Jakarta' }, weight);
            expect(jakarta).toBe(10000);

            // Nearby cities (1.3x)
            const bogor = calculateShippingCost(courier, { postalCode: '16000', city: 'Bogor' }, weight);
            expect(bogor).toBe(13000);

            // Other Java (1.5x)
            const semarang = calculateShippingCost(courier, { postalCode: '50000', city: 'Semarang' }, weight);
            expect(semarang).toBe(15000);

            // Outside Java (2.0x)
            const bali = calculateShippingCost(courier, { postalCode: '80000', city: 'Denpasar' }, weight);
            expect(bali).toBe(20000);
        });

        it('should return 0 for invalid inputs', () => {
            const courier = { id: 'jne-reg', name: 'JNE', serviceType: 'regular' };
            const destination = { postalCode: '12345', city: 'Jakarta' };

            expect(calculateShippingCost(null, destination, 5)).toBe(0);
            expect(calculateShippingCost(courier, null, 5)).toBe(0);
            expect(calculateShippingCost(courier, destination, 0)).toBe(0);
            expect(calculateShippingCost(courier, destination, null)).toBe(0);
        });

        it('should use default base rate for unknown courier', () => {
            const courier = { id: 'unknown-courier', name: 'Unknown', serviceType: 'regular' };
            const destination = { postalCode: '12345', city: 'Jakarta' };
            const weight = 2;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(20000); // 2kg * 10000 (default) * 1.0 = 20000
        });

        it('should handle invalid postal codes with default multiplier', () => {
            const courier = { id: 'jne-reg', name: 'JNE', serviceType: 'regular' };
            const destination = { postalCode: '', city: 'Jakarta' };
            const weight = 2;

            const cost = calculateShippingCost(courier, destination, weight);
            expect(cost).toBe(30000); // 2kg * 10000 * 1.5 (default) = 30000
        });
    });
});
