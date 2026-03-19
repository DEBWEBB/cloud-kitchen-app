// src/pages/Cart.jsx
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { cart, addToCart, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  const totalPrice = cart.reduce((sum, item) => sum + item.price * (item.qty || item.quantity || 1), 0);

  return (
    <div className="min-h-screen pt-20 px-6 pb-10 bg-white dark:bg-gray-900 text-black dark:text-white">
      <h2 className="text-2xl font-bold mb-6">🛒 Your Cart</h2>

      {cart.length === 0 ? (
        <p className="text-lg text-center text-gray-500 dark:text-gray-400">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-6">
            {cart.map((item) => (
              <div key={item.id} className="flex gap-4 items-start p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
                <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                  <p className="font-semibold mt-1">₹{item.price}</p>
                  <div className="flex items-center gap-2 mt-2"> 
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-black dark:text-white"
                    >−</button>
                    <span className="px-2 font-semibold">{item.qty || item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-black dark:text-white"
                    >+</button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >❌</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-right">
            <h3 className="text-xl font-bold">Total: ₹{totalPrice}</h3>
            <button
              onClick={() => navigate("/checkout")}
              className="mt-4 px-6 py-3 bg-pink-600 text-white rounded hover:bg-pink-700"
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
