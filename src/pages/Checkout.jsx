import { useCart } from "../context/CartContext";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Checkout() {
  const { cart, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handlePlaceOrder = async () => {
    const user = auth.currentUser;

    if (!user) {
      alert("Please login to place order.");
      return;
    }

    const order = {
      userId: user.uid,
      items: cart,
      total: cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0),
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "orders"), order);

    // Clear cart manually
    cart.forEach((_, idx) => removeFromCart(idx));

    navigate("/success");
  };

  return (
    <div className="min-h-screen pt-20 p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul className="mb-4">
            {cart.map((item, index) => (
              <li key={index} className="border-b py-2">
                {item.name} - ₹{item.price}
              </li>
            ))}
          </ul>
          <p className="font-bold mb-4">
            Total: ₹{cart.reduce((sum, item) => sum + item.price, 0)}
          </p>
          <button
            onClick={handlePlaceOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Place Order
          </button>
        </>
      )}
    </div>
  );
}
