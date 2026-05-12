import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Custom hook to fetch a single product from Firestore.
 *
 * @param {string} productId - The Firestore document ID of the product
 * @returns {{ product: object|null, loading: boolean, error: string|null }}
 */
export function useProduct(productId) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            setError("Product ID is required");
            return;
        }

        let cancelled = false;

        async function fetchProduct() {
            setLoading(true);
            setError(null);

            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (!cancelled) {
                    if (docSnap.exists()) {
                        setProduct({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setError("Produk tidak ditemukan");
                        setProduct(null);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Gagal memuat produk. Silakan coba lagi.");
                    setProduct(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchProduct();

        return () => {
            cancelled = true;
        };
    }, [productId]);

    return { product, loading, error };
}

/**
 * Custom hook to fetch all products from Firestore.
 *
 * @returns {{ products: object[], loading: boolean, error: string|null }}
 */
export function useProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchProducts() {
            setLoading(true);
            setError(null);

            try {
                const querySnapshot = await getDocs(collection(db, "products"));

                if (!cancelled) {
                    const docs = querySnapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    }));
                    setProducts(docs);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Gagal memuat produk. Silakan coba lagi.");
                    setProducts([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchProducts();

        return () => {
            cancelled = true;
        };
    }, []);

    return { products, loading, error };
}

export default useProduct;
