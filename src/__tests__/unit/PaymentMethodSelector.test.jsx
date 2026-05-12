/**
 * Unit tests for PaymentMethodSelector component
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 14.1, 14.2, 14.3, 14.4, 14.5
 *
 * Tests that the PaymentMethodSelector component:
 * - Displays all four required payment methods
 * - Shows payment method details (name, icon, description)
 * - Displays fee information correctly
 * - Shows E-Wallet providers
 * - Handles payment method selection
 * - Provides visual indication of selected method
 * - Calculates payment fees correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import * as PaymentService from '../../services/PaymentService';

// ── Mock PaymentService ──────────────────────────────────────────────────────

vi.mock('../../services/PaymentService', () => ({
    getPaymentMethods: vi.fn(),
    calculatePaymentFee: vi.fn()
}));

// ── Test Data ────────────────────────────────────────────────────────────────

const mockPaymentMethods = [
    {
        id: 'bank_transfer',
        name: 'Transfer Bank',
        type: 'bank_transfer',
        icon: '🏦',
        description: 'Instruksi pembayaran akan dikirim setelah order dibuat',
        fee: 0
    },
    {
        id: 'ewallet',
        name: 'E-Wallet',
        type: 'ewallet',
        icon: '💳',
        description: 'GoPay, OVO, Dana, ShopeePay',
        fee: 0,
        providers: ['GoPay', 'OVO', 'Dana', 'ShopeePay']
    },
    {
        id: 'card',
        name: 'Kartu Kredit/Debit',
        type: 'card',
        icon: '💳',
        description: 'Detail kartu akan diminta di langkah berikutnya',
        fee: 0.029
    },
    {
        id: 'cod',
        name: 'Bayar di Tempat (COD)',
        type: 'cod',
        icon: '💵',
        description: 'Bayar saat barang diterima',
        fee: 5000
    }
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PaymentMethodSelector Component', () => {
    let mockOnPaymentSelect;

    beforeEach(() => {
        mockOnPaymentSelect = vi.fn();
        PaymentService.getPaymentMethods.mockReturnValue(mockPaymentMethods);
        PaymentService.calculatePaymentFee.mockImplementation((methodId, total) => {
            if (methodId === 'card') return Math.round(total * 0.029);
            if (methodId === 'cod') return 5000;
            return 0;
        });
    });

    describe('Requirement 13.1, 13.2: Display all four payment methods', () => {
        it('displays Bank Transfer payment method', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
        });

        it('displays E-Wallet payment method', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('E-Wallet')).toBeInTheDocument();
        });

        it('displays Credit/Debit Card payment method', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Kartu Kredit/Debit')).toBeInTheDocument();
        });

        it('displays Cash on Delivery (COD) payment method', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Bayar di Tempat (COD)')).toBeInTheDocument();
        });
    });

    describe('Requirement 14.1: Display payment method name and icon', () => {
        it('displays payment method names', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Transfer Bank')).toBeInTheDocument();
            expect(screen.getByText('E-Wallet')).toBeInTheDocument();
            expect(screen.getByText('Kartu Kredit/Debit')).toBeInTheDocument();
            expect(screen.getByText('Bayar di Tempat (COD)')).toBeInTheDocument();
        });

        it('displays payment method icons', () => {
            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            // Check that icons are rendered (emojis)
            expect(container.textContent).toContain('🏦');
            expect(container.textContent).toContain('💳');
            expect(container.textContent).toContain('💵');
        });
    });

    describe('Requirement 14.2: Bank Transfer payment instructions', () => {
        it('displays bank transfer description', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Instruksi pembayaran akan dikirim setelah order dibuat')).toBeInTheDocument();
        });
    });

    describe('Requirement 14.3: E-Wallet supported providers', () => {
        it('displays E-Wallet description', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('GoPay, OVO, Dana, ShopeePay')).toBeInTheDocument();
        });

        it('displays E-Wallet provider badges', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('GoPay')).toBeInTheDocument();
            expect(screen.getByText('OVO')).toBeInTheDocument();
            expect(screen.getByText('Dana')).toBeInTheDocument();
            expect(screen.getByText('ShopeePay')).toBeInTheDocument();
        });
    });

    describe('Requirement 14.4: Credit/Debit Card details', () => {
        it('displays card payment description', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Detail kartu akan diminta di langkah berikutnya')).toBeInTheDocument();
        });

        it('displays card processing fee percentage', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText(/2\.9% dari total/)).toBeInTheDocument();
        });
    });

    describe('Requirement 14.5: COD fee display', () => {
        it('displays COD description', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Bayar saat barang diterima')).toBeInTheDocument();
        });

        it('displays COD flat fee', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText(/Rp\s*5\.000/)).toBeInTheDocument();
        });
    });

    describe('Requirement 13.3: Selectable payment method elements', () => {
        it('renders payment methods as buttons', () => {
            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const buttons = container.querySelectorAll('button[role="radio"]');
            expect(buttons.length).toBe(4);
        });

        it('payment method buttons are clickable', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const bankTransferButton = screen.getByRole('radio', { name: /Transfer Bank/ });
            fireEvent.click(bankTransferButton);

            expect(mockOnPaymentSelect).toHaveBeenCalledTimes(1);
        });
    });

    describe('Requirement 13.4: Visual indication of selected payment method', () => {
        it('highlights selected payment method with CSS class', () => {
            const selectedMethod = mockPaymentMethods[0]; // Bank Transfer

            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={selectedMethod}
                    orderTotal={100000}
                />
            );

            const selectedButton = screen.getByRole('radio', { name: /Transfer Bank/ });
            expect(selectedButton.className).toContain('border-blue-600');
            expect(selectedButton.className).toContain('bg-blue-50');
        });

        it('sets aria-checked to true for selected payment method', () => {
            const selectedMethod = mockPaymentMethods[1]; // E-Wallet

            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={selectedMethod}
                    orderTotal={100000}
                />
            );

            const selectedButton = screen.getByRole('radio', { name: /E-Wallet/ });
            expect(selectedButton.getAttribute('aria-checked')).toBe('true');
        });

        it('shows radio button indicator for selected method', () => {
            const selectedMethod = mockPaymentMethods[2]; // Card

            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={selectedMethod}
                    orderTotal={100000}
                />
            );

            const selectedButton = screen.getByRole('radio', { name: /Kartu Kredit/ });
            const radioIndicator = selectedButton.querySelector('.bg-blue-600');
            expect(radioIndicator).toBeInTheDocument();
        });

        it('does not highlight unselected payment methods', () => {
            const selectedMethod = mockPaymentMethods[0]; // Bank Transfer

            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={selectedMethod}
                    orderTotal={100000}
                />
            );

            const unselectedButton = screen.getByRole('radio', { name: /E-Wallet/ });
            expect(unselectedButton.className).toContain('border-gray-200');
            expect(unselectedButton.className).not.toContain('border-blue-600');
        });
    });

    describe('Payment method selection and callback', () => {
        it('calls onPaymentSelect with correct method when Bank Transfer is selected', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const bankTransferButton = screen.getByRole('radio', { name: /Transfer Bank/ });
            fireEvent.click(bankTransferButton);

            expect(mockOnPaymentSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'bank_transfer',
                    name: 'Transfer Bank',
                    type: 'bank_transfer',
                    calculatedFee: 0
                })
            );
        });

        it('calls onPaymentSelect with correct method when E-Wallet is selected', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const ewalletButton = screen.getByRole('radio', { name: /E-Wallet/ });
            fireEvent.click(ewalletButton);

            expect(mockOnPaymentSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'ewallet',
                    name: 'E-Wallet',
                    type: 'ewallet',
                    calculatedFee: 0
                })
            );
        });

        it('calls onPaymentSelect with correct method and fee when Card is selected', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const cardButton = screen.getByRole('radio', { name: /Kartu Kredit/ });
            fireEvent.click(cardButton);

            expect(PaymentService.calculatePaymentFee).toHaveBeenCalledWith('card', 100000);
            expect(mockOnPaymentSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'card',
                    name: 'Kartu Kredit/Debit',
                    type: 'card',
                    calculatedFee: 2900 // 2.9% of 100000
                })
            );
        });

        it('calls onPaymentSelect with correct method and fee when COD is selected', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const codButton = screen.getByRole('radio', { name: /Bayar di Tempat/ });
            fireEvent.click(codButton);

            expect(PaymentService.calculatePaymentFee).toHaveBeenCalledWith('cod', 100000);
            expect(mockOnPaymentSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'cod',
                    name: 'Bayar di Tempat (COD)',
                    type: 'cod',
                    calculatedFee: 5000
                })
            );
        });
    });

    describe('Edge cases', () => {
        it('displays message when no payment methods are available', () => {
            PaymentService.getPaymentMethods.mockReturnValue([]);

            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            expect(screen.getByText('Tidak ada metode pembayaran tersedia saat ini.')).toBeInTheDocument();
        });

        it('handles zero order total', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={0}
                />
            );

            const cardButton = screen.getByRole('radio', { name: /Kartu Kredit/ });
            fireEvent.click(cardButton);

            expect(PaymentService.calculatePaymentFee).toHaveBeenCalledWith('card', 0);
        });

        it('handles large order total', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={10000000}
                />
            );

            const cardButton = screen.getByRole('radio', { name: /Kartu Kredit/ });
            fireEvent.click(cardButton);

            expect(PaymentService.calculatePaymentFee).toHaveBeenCalledWith('card', 10000000);
            expect(mockOnPaymentSelect).toHaveBeenCalledWith(
                expect.objectContaining({
                    calculatedFee: 290000 // 2.9% of 10000000
                })
            );
        });
    });

    describe('Accessibility', () => {
        it('uses role="radio" for payment method buttons', () => {
            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const radioButtons = container.querySelectorAll('[role="radio"]');
            expect(radioButtons.length).toBe(4);
        });

        it('provides aria-label for payment method buttons', () => {
            render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const bankTransferButton = screen.getByRole('radio', { name: /Transfer Bank/ });
            expect(bankTransferButton).toHaveAttribute('aria-label');
        });

        it('provides aria-checked attribute for all payment methods', () => {
            const { container } = render(
                <PaymentMethodSelector
                    onPaymentSelect={mockOnPaymentSelect}
                    selectedMethod={null}
                    orderTotal={100000}
                />
            );

            const radioButtons = container.querySelectorAll('[role="radio"]');
            radioButtons.forEach(button => {
                expect(button).toHaveAttribute('aria-checked');
            });
        });
    });
});
