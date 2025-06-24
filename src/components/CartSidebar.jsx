import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import qrImage from "../assets/qr.jpg"; // ✅ Save uploaded QR as src/assets/qr.jpg
import { useState } from "react";

export default function CartSidebar() {
  const { cart, setCart } = useCart();
  const { user } = useAuth();
  const [method, setMethod] = useState("upi");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

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

    alert("✅ Order placed successfully!");
    setCart([]);
  };

  return (
    <div className="p-4 text-black">
      <h2 className="text-xl font-bold mb-4">Total: ₹{total}</h2>

      <div className="mb-4">
        <label className="font-semibold">Choose Payment Method:</label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="payment" value="upi" checked={method === "upi"} onChange={() => setMethod("upi")} />
            UPI
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="payment" value="cod" checked={method === "cod"} onChange={() => setMethod("cod")} />
            Cash on Delivery
          </label>
        </div>
      </div>

      {method === "upi" && (
        <div className="mb-4 text-center">
          <img src={qrImage} alt="Pay via UPI" className="w-40 mx-auto mb-2 rounded shadow" />
          <p className="text-sm text-gray-600">Scan & pay to <strong>9734278080@ptyes</strong></p>
          <p className="text-xs text-red-500 mt-1">* Mark as paid after scanning</p>
        </div>
      )}

      <button
        onClick={handlePlaceOrder}
        className="bg-green-600 text-white py-2 w-full rounded"
      >
        Place Order
      </button>
    </div>
  );
}
