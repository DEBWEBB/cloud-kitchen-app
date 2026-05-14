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
    <div className="min-h-screen bg-gray-50 pt-20 text-black dark:bg-gray-950 dark:text-white md:pt-24">
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
          <div className="grid gap-6 pb-40 lg:grid-cols-[1.3fr_0.7fr] lg:pb-0">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="card flex flex-col gap-4 p-4 sm:flex-row md:p-5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-44 w-full rounded-2xl object-cover sm:h-28 sm:w-28"
                  />
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
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

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="price">Rs.{item.price}</span>
                      <div className="flex w-full items-center justify-between gap-2 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800 sm:w-auto sm:justify-start">
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
                className="btn-primary hidden w-full justify-center text-center lg:flex"
              >
                Proceed to Checkout
              </button>
            </aside>
          </div>
        )}
      </div>

      {cart.length > 0 ? (
        <div
          className="fixed inset-x-0 z-40 px-4 lg:hidden"
          style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-[1.8rem] border border-white/70 bg-white/95 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <div className="min-w-0 flex-1 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Cart total
              </p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                Rs.{totalPrice}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {cart.length} product{cart.length === 1 ? "" : "s"} ready for checkout
              </p>
            </div>
            <button
              onClick={() => navigate("/checkout")}
              className="shrink-0 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,114,182,0.24)]"
            >
              Checkout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Cart;
