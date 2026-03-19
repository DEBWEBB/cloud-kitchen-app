import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { menuItems } from "../data/menu";
import { useCart } from "../context/CartContext";
import MenuItemCard from "./MenuItemCard";

const SHOP_COPY = {
  mio: {
    title: "Mio Amore Menu",
    subtitle: "Bestselling cakes, rich pastries, and quick snacks arranged in a premium browsing experience.",
  },
  monginis: {
    title: "Monginis Menu",
    subtitle: "Explore signature desserts, snack picks, and celebration favorites with a cleaner ordering flow.",
  },
};

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = ["all", "cakes", "snacks", "pastries"];
  const filteredItems = menuItems.filter(
    (item) =>
      item.shop?.toLowerCase() === shopId?.toLowerCase() &&
      (selectedCategory === "all" || item.category === selectedCategory)
  );
  const shopMeta = SHOP_COPY[shopId] || SHOP_COPY.mio;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 text-black dark:bg-gray-950 dark:text-white">
      <div className="page-container">
        <div className="mb-8 flex flex-col gap-3">
          <span className="chip w-fit bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
            Curated menu
          </span>
          <h2 className="section-title">{shopMeta.title}</h2>
          <p className="muted max-w-2xl">{shopMeta.subtitle}</p>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`chip whitespace-nowrap capitalize ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
            ))
          ) : (
            <div className="card col-span-full p-10 text-center">
              <p className="section-title mb-2 text-lg">No items found</p>
              <p className="muted">Try switching the category filter for this shop.</p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 flex w-[92%] max-w-xl -translate-x-1/2 justify-center">
            <button
              className="btn-primary pointer-events-auto flex w-full items-center justify-between rounded-2xl px-5 py-4 text-sm shadow-xl"
              onClick={() => navigate("/cart")}
            >
              <span>Go to Cart</span>
              <span>{cart.reduce((sum, i) => sum + i.quantity, 0)} items</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
