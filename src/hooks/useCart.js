import { useContext } from "react";
import { CartContext } from "../context/CartContext";

/**
 * Custom hook to consume CartContext.
 * Must be used inside a CartProvider.
 *
 * @returns {{ items, totalItems, totalAmount, addItem, removeItem, updateQuantity, clearCart }}
 */
export function useCart() {
    const context = useContext(CartContext);

    if (context === null) {
        throw new Error("useCart must be used within a CartProvider");
    }

    return context;
}

export default useCart;
