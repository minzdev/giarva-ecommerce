import { createContext, useReducer } from "react";

const CartContext = createContext(null);

/**
 * Recalculates totalItems and totalAmount from the items array.
 * @param {CartItem[]} items
 * @returns {{ totalItems: number, totalAmount: number }}
 */
function calculateTotals(items) {
    return items.reduce(
        (acc, item) => ({
            totalItems: acc.totalItems + item.quantity,
            totalAmount: acc.totalAmount + item.price * item.quantity,
        }),
        { totalItems: 0, totalAmount: 0 }
    );
}

const initialState = {
    items: [],
    totalItems: 0,
    totalAmount: 0,
};

/**
 * Cart reducer — handles all cart state transitions.
 * @param {object} state
 * @param {{ type: string, payload?: any }} action
 */
function cartReducer(state, action) {
    switch (action.type) {
        case "ADD_ITEM": {
            const { product, quantity = 1 } = action.payload;
            const existingIndex = state.items.findIndex(
                (item) => item.productId === product.productId
            );

            let updatedItems;
            if (existingIndex >= 0) {
                // Product already in cart — increment quantity
                updatedItems = state.items.map((item, index) =>
                    index === existingIndex
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                // New product — append to cart
                updatedItems = [...state.items, { ...product, quantity }];
            }

            return {
                items: updatedItems,
                ...calculateTotals(updatedItems),
            };
        }

        case "REMOVE_ITEM": {
            const updatedItems = state.items.filter(
                (item) => item.productId !== action.payload.productId
            );
            return {
                items: updatedItems,
                ...calculateTotals(updatedItems),
            };
        }

        case "UPDATE_QUANTITY": {
            const { productId, quantity } = action.payload;

            // Remove item if quantity drops to 0 or below
            if (quantity <= 0) {
                const updatedItems = state.items.filter(
                    (item) => item.productId !== productId
                );
                return {
                    items: updatedItems,
                    ...calculateTotals(updatedItems),
                };
            }

            const updatedItems = state.items.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
            );
            return {
                items: updatedItems,
                ...calculateTotals(updatedItems),
            };
        }

        case "CLEAR_CART":
            return { ...initialState };

        default:
            return state;
    }
}

/**
 * CartProvider wraps the app and provides cart state globally.
 * Exposes: { items, totalItems, totalAmount, addItem, removeItem, updateQuantity, clearCart }
 */
export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    /**
     * Add a product to the cart.
     * If the product already exists, its quantity is incremented.
     * @param {CartItem} product - CartItem shape (productId, name, price, imageUrl)
     * @param {number} [quantity=1]
     */
    function addItem(product, quantity = 1) {
        dispatch({ type: "ADD_ITEM", payload: { product, quantity } });
    }

    /**
     * Remove a product from the cart entirely.
     * @param {string} productId
     */
    function removeItem(productId) {
        dispatch({ type: "REMOVE_ITEM", payload: { productId } });
    }

    /**
     * Update the quantity of a product in the cart.
     * If quantity ≤ 0, the item is removed.
     * @param {string} productId
     * @param {number} quantity
     */
    function updateQuantity(productId, quantity) {
        dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } });
    }

    /**
     * Clear all items from the cart.
     */
    function clearCart() {
        dispatch({ type: "CLEAR_CART" });
    }

    const value = {
        items: state.items,
        totalItems: state.totalItems,
        totalAmount: state.totalAmount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export { CartContext };
export default CartContext;
