import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Cart = () => {
  const { cart, addToCart, removeFromCart } = useCart();
  const navigate = useNavigate();

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * (item.qty || item.quantity || 1),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-24 text-black dark:bg-gray-950 dark:text-white">
      <div className="page-container">
        <div className="mb-8">
          <h2 className="section-title">Your Cart</h2>
          <p className="muted mt-2">Review your selected items before checkout.</p>
        </div>

        {cart.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="section-title mb-2 text-lg">Your cart is empty</p>
            <p className="muted">Browse the menu and add a few favorites first.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="card flex gap-4 p-4 md:p-5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-24 rounded-2xl object-cover md:h-28 md:w-28"
                  />
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </h3>
                        <p className="muted mt-1">{item.description}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="btn-ghost px-2.5 py-2 text-xs text-red-500 dark:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="price">Rs.{item.price}</span>
                      <div className="flex items-center gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
                        <button onClick={() => removeFromCart(item.id)} className="btn-ghost px-3 py-1.5">
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">
                          {item.qty || item.quantity}
                        </span>
                        <button onClick={() => addToCart(item)} className="btn-ghost px-3 py-1.5">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="card h-fit p-5 lg:sticky lg:top-24">
              <h3 className="section-title mb-1 text-lg">Summary</h3>
              <p className="muted mb-6">A quick overview before you place the order.</p>

              <div className="space-y-3 border-b border-gray-100 pb-4 dark:border-gray-800">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {item.name} x {item.qty || item.quantity || 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Rs.{item.price * (item.qty || item.quantity || 1)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between py-5">
                <span className="text-base font-semibold text-gray-700 dark:text-gray-200">Total</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">Rs.{totalPrice}</span>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className="btn-primary sticky bottom-0 w-full justify-center text-center"
              >
                Proceed to Checkout
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
