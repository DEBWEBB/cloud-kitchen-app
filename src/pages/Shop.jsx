import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import mioAmoreImage from "../assets/mioamore.jpeg";
import monginisImage from "../assets/monginis.png";

const stores = [
  {
    id: "mio",
    name: "Mio Amore",
    image: mioAmoreImage,
    badge: "Popular",
    rating: 4.7,
    eta: "25-35 min",
    tags: ["Cakes", "Pastries", "Snacks"],
    description: "Fresh cakes, pastries, and celebration boxes with quick dispatch.",
  },
  {
    id: "monginis",
    name: "Monginis",
    image: monginisImage,
    badge: "Top Rated",
    rating: 4.5,
    eta: "20-30 min",
    tags: ["Desserts", "Cupcakes", "Cookies"],
    description: "Classic dessert picks, premium sweets, and ready-to-order treats.",
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filteredStores = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return stores;

    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(normalized) ||
        store.tags.some((tag) => tag.toLowerCase().includes(normalized))
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 dark:bg-gray-950">
      <div className="page-container space-y-8">
        <section className="card overflow-hidden p-0">
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-8 text-white">
            <span className="chip inline-flex border border-white/20 bg-white/15 text-white">
              Browse shops
            </span>
            <h1 className="mt-4 text-3xl font-bold md:text-4xl">Choose a store before you order</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85 md:text-base">
              Explore available cloud-kitchen partners, compare delivery speed, and jump directly into the menu.
            </p>
          </div>
          <div className="p-6">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shops, cakes, pastries..."
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredStores.map((store, index) => (
            <motion.button
              key={store.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/shop/${store.id}`)}
              className="card overflow-hidden p-0 text-left"
            >
              <div className="relative h-56 overflow-hidden">
                <img src={store.image} alt={store.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900">
                  {store.badge}
                </span>
                <span className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {store.eta}
                </span>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{store.name}</h2>
                    <p className="muted mt-1">{store.description}</p>
                  </div>
                  <span className="rounded-xl bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {store.rating}★
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {store.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="muted">Tap to open menu</span>
                  <span className="btn-primary text-sm">Open Shop</span>
                </div>
              </div>
            </motion.button>
          ))}

          {filteredStores.length === 0 && (
            <div className="card col-span-full p-10 text-center">
              <p className="section-title mb-2 text-lg">No matching shops found</p>
              <p className="muted">Try searching by store name or dessert category.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
