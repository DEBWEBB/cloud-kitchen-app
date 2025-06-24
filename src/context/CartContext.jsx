// src/context/CartContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const user = auth.currentUser;

  const userRef = user ? doc(db, "users", user.uid, "cart", "current") : null;

  // 🔁 Sync cart from Firestore
  useEffect(() => {
    if (!userRef) return;

    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setCart(docSnap.data().items || []);
      }
    });

    return () => unsub();
  }, [userRef]);

  // 🧠 Save cart to Firestore
  const saveCart = async (items) => {
    if (userRef) {
      await setDoc(userRef, { items });
    }
  };

  // ➕ Add item to cart
  const addToCart = (item) => {
    const exists = cart.find((i) => i.id === item.id);
    let updated;

    if (exists) {
      updated = cart.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      updated = [...cart, { ...item, quantity: 1 }];
    }

    setCart(updated);
    saveCart(updated);
  };

  // ➖ Remove from cart
  const removeFromCart = (itemId) => {
    const exists = cart.find((i) => i.id === itemId);
    let updated;

    if (exists.quantity > 1) {
      updated = cart.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    } else {
      updated = cart.filter((i) => i.id !== itemId);
    }

    setCart(updated);
    saveCart(updated);
  };

  // 🔁 Update quantity directly
  const updateQuantity = (itemId, newQty) => {
    if (newQty < 1) return;
    const updated = cart.map((i) =>
      i.id === itemId ? { ...i, quantity: newQty } : i
    );
    setCart(updated);
    saveCart(updated);
  };

  // ❌ Clear entire cart
  const clearCart = () => {
    setCart([]);
    saveCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
