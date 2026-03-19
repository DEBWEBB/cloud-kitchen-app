// src/pages/Home.jsx — Redesigned with richer UX
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const STORES = [
  {
    id: "mio",
    name: "Mio Amore",
    image: "/images/food1.png",
    badge: "🔥 Popular",
    rating: 4.7,
    reviews: 284,
    tags: ["Cakes", "Pastries", "Bread"],
    deliveryTime: "25–35 min",
    minOrder: "₹100",
    description: "Freshly baked cakes, pastries & celebration cakes",
  },
  {
    id: "monginis",
    name: "Monginis",
    image: "/images/shop1.png",
    badge: "⭐ Top Rated",
    rating: 4.5,
    reviews: 197,
    tags: ["Chocolates", "Cupcakes", "Cookies"],
    deliveryTime: "20–30 min",
    minOrder: "₹80",
    description: "Premium chocolates, cupcakes and festive sweets",
  },
];

const FOOD_QUOTES = [
  "Life is short — eat the cake first! 🎂",
  "Good food is the foundation of genuine happiness.",
  "You can't buy happiness, but you can buy cake. 🍰",
  "A party without cake is just a meeting.",
  "There is no sincerer love than the love of food.",
];

const FEATURES = [
  { icon: "🚀", label: "Fast Delivery" },
  { icon: "🔒", label: "Safe Payment" },
  { icon: "⭐", label: "Top Quality" },
  { icon: "🎁", label: "Gift Wrapping" },
];

export default function Home() {
  const navigate = useNavigate();
  const [quote] = useState(() => FOOD_QUOTES[Math.floor(Math.random() * FOOD_QUOTES.length)]);
  const [search, setSearch] = useState("");
  const [hoveredStore, setHoveredStore] = useState(null);

  const filtered = STORES.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-colors duration-300">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pb-10 pt-12 px-4">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-pink-200 dark:bg-pink-900/20 rounded-full blur-3xl opacity-40 pointer-events-none" />
        <div className="absolute top-40 -left-20 w-60 h-60 bg-orange-200 dark:bg-orange-900/20 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.p
            className="text-sm font-semibold tracking-widest text-pink-500 dark:text-pink-400 uppercase mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Fresh from our cloud kitchen
          </motion.p>

          <motion.h1
            className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Delicious food, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">
              delivered fast 🍰
            </span>
          </motion.h1>

          <motion.p
            className="mt-4 text-gray-500 dark:text-gray-400 text-lg italic max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            "{quote}"
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm"
              >
                {f.icon} {f.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-4 mb-8">
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores or items (e.g. cakes, cookies...)"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 transition placeholder-gray-400 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            >
              ✕
            </button>
          )}
        </motion.div>
      </section>

      {/* ── Store Grid ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-6">
          {search ? `Results for "${search}"` : "Our Stores"}
          <span className="ml-2 text-sm font-normal text-gray-400">({filtered.length})</span>
        </h2>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              className="text-center py-20 text-gray-400 dark:text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-lg font-medium">No stores match your search</p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-pink-500 hover:text-pink-600 text-sm font-medium"
              >
                Clear search
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((store, index) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  index={index}
                  hovered={hoveredStore === store.id}
                  onHover={() => setHoveredStore(store.id)}
                  onLeave={() => setHoveredStore(null)}
                  onClick={() => navigate(`/shop/${store.id}`)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function StoreCard({ store, index, hovered, onHover, onLeave, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700"
      whileHover={{ y: -4 }}
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={store.image}
          alt={store.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/400x200?text=HungryBox";
          }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Badge */}
        <span className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-800 dark:text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          {store.badge}
        </span>

        {/* Delivery time chip */}
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
          🕐 {store.deliveryTime}
        </span>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
            {store.name}
          </h3>
          {/* Rating */}
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold px-2 py-0.5 rounded-lg">
            ⭐ {store.rating}
            <span className="text-xs font-normal text-gray-400 ml-0.5">({store.reviews})</span>
          </div>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{store.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {store.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 px-2.5 py-0.5 rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Min. order: {store.minOrder}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-pink-500 to-orange-400 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:from-pink-600 hover:to-orange-500 transition shadow-sm"
          >
            Order Now →
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}