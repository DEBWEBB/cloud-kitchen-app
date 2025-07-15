import { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const userRef = doc(db, "users", userId, "cart", "current");

    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setCart(docSnap.data().items || []);
      }
    });

    return () => unsub();
  }, [userId]);

  const saveCart = async (items) => {
    if (userId) {
      const userRef = doc(db, "users", userId, "cart", "current");
      await setDoc(userRef, { items });
    }
  };

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

  const removeFromCart = (itemId) => {
    const exists = cart.find((i) => i.id === itemId);
    let updated;

    if (exists && exists.quantity > 1) {
      updated = cart.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    } else {
      updated = cart.filter((i) => i.id !== itemId);
    }

    setCart(updated);
    saveCart(updated);
  };

  const updateQuantity = (itemId, newQty) => {
    if (newQty < 1) return;
    const updated = cart.map((i) =>
      i.id === itemId ? { ...i, quantity: newQty } : i
    );
    setCart(updated);
    saveCart(updated);
  };

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
