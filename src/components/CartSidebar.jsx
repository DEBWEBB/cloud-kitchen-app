import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import qrImage from "../assets/qr.jpg";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { db } from "../firebase/config";

export default function CartSidebar() {
  const { cart, setCart } = useCart();
  const { user } = useAuth();
  const [method, setMethod] = useState("upi");

  const total = cart
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);

  const handlePlaceOrder = async () => {
    if (!user) return alert("Please log in");

    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      items: cart,
      total: parseFloat(total),
      paymentMethod: method,
      createdAt: serverTimestamp(),
      paymentStatus: method === "upi" ? "pending" : "cod",
    });

    alert("Order placed successfully!");
    setCart([]);
  };

  return (
    <div className="card sticky top-24 p-5 text-black shadow-xl dark:text-white">
      <h2 className="section-title mb-1 text-lg">Cart Summary</h2>
      <p className="muted mb-5">Review payment and place your order.</p>

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
        <span className="price">Rs.{total}</span>
      </div>

      <div className="mb-4">
        <label className="mb-3 block text-sm font-semibold text-gray-800 dark:text-white">
          Choose Payment Method
        </label>
        <div className="grid gap-2">
          <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <input
              type="radio"
              name="payment"
              value="upi"
              checked={method === "upi"}
              onChange={() => setMethod("upi")}
            />
            UPI
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700">
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
            />
            Cash on Delivery
          </label>
        </div>
      </div>

      {method === "upi" && (
        <div className="mb-5 rounded-2xl bg-gray-50 p-4 text-center dark:bg-gray-800">
          <img
            src={qrImage}
            alt="Pay via UPI"
            className="mx-auto mb-3 w-40 rounded-2xl shadow-sm"
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Scan & pay to <strong>9734278080@ptyes</strong>
          </p>
          <p className="mt-1 text-xs text-red-500">Mark as paid after scanning</p>
        </div>
      )}

      <button
        onClick={handlePlaceOrder}
        className="btn-primary sticky bottom-0 w-full justify-center text-center"
      >
        Place Order
      </button>
    </div>
  );
}
