import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import fallbackImage from "../assets/HungryBOX-logo.jpg";
import { shopCatalog } from "../data/shops";

const FOOD_QUOTES = [
  "Life is short, eat the cake first.",
  "Good food is the foundation of genuine happiness.",
  "You cannot buy happiness, but you can buy cake.",
  "A party without cake is just a meeting.",
  "There is no sincerer love than the love of food.",
];

const FEATURES = [
  { icon: "Fast", label: "Fast Local Delivery" },
  { icon: "Near", label: "Bethuadahari Area Only" },
  { icon: "Safe", label: "Secure Checkout" },
  { icon: "Fresh", label: "Fresh Bakery Picks" },
];

export default function Home() {
  const navigate = useNavigate();
  const [quote] = useState(
    () => FOOD_QUOTES[Math.floor(Math.random() * FOOD_QUOTES.length)]
  );
  const [search, setSearch] = useState("");
  const [hoveredStore, setHoveredStore] = useState(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = shopCatalog.filter((store) => {
    if (!normalizedSearch) return true;

    return (
      store.name.toLowerCase().includes(normalizedSearch) ||
      store.localName.toLowerCase().includes(normalizedSearch) ||
      store.address.toLowerCase().includes(normalizedSearch) ||
      store.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 transition-colors duration-300 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <section className="relative overflow-hidden px-4 pb-8 pt-8 sm:pb-10 sm:pt-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-pink-200 opacity-40 blur-3xl dark:bg-pink-900/20" />
        <div className="pointer-events-none absolute -left-20 top-40 h-60 w-60 rounded-full bg-orange-200 opacity-30 blur-3xl dark:bg-orange-900/20" />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.p
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-pink-500 dark:text-pink-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Fresh from our cloud kitchen
          </motion.p>

          <motion.h1
            className="text-3xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-4xl md:text-6xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Local cakes and bakery picks
            <br />
            <span className="bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
              delivered in Bethuadahari
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-4 max-w-xl text-base italic text-gray-500 dark:text-gray-400 sm:text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            "{quote}"
          </motion.p>

          <motion.p
            className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            Orders are currently served only from our nearby Bethuadahari partner shops.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {FEATURES.map((feature) => (
              <span
                key={feature.label}
                className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <span className="text-pink-500 dark:text-pink-400">
                  {feature.icon}
                </span>
                {feature.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mb-8 max-w-xl px-4">
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 sm:text-base">
            Search
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search local shops, Bengali names, or Bethuadahari address"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-[4.7rem] pr-16 text-sm text-gray-800 shadow-md transition placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:pl-20"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 transition hover:text-gray-600 sm:text-sm"
            >
              Clear
            </button>
          ) : null}
        </motion.div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-xl font-bold text-gray-700 dark:text-gray-200">
          {search ? `Results for "${search}"` : "Local Shops"}
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({filtered.length})
          </span>
        </h2>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              className="py-20 text-center text-gray-400 dark:text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="mb-3 text-4xl">No Match</p>
              <p className="text-lg font-medium">No local shop matches your search</p>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 text-sm font-medium text-pink-500 hover:text-pink-600"
              >
                Clear search
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-all duration-300 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800"
      whileHover={{ y: -4 }}
    >
      <div className="relative h-48 overflow-hidden sm:h-52">
        <img
          src={store.image}
          alt={store.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(event) => {
            event.target.src = fallbackImage;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-800 shadow backdrop-blur-sm dark:bg-gray-800/90 dark:text-white">
          {store.badge}
        </span>

        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {store.deliveryTime}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 transition-colors group-hover:text-pink-600 dark:text-white dark:group-hover:text-pink-400">
              {store.name}
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {store.localName}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-0.5 text-sm font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span>{store.rating}</span>
            <span className="text-xs font-normal text-gray-400">
              ({store.reviews})
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">{store.type}</p>
        {store.priceRange ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {store.priceRange}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {store.description}
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {store.address}
        </p>

        <div className="mb-4 mt-4 flex flex-wrap gap-1.5">
          {store.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-medium text-pink-600 dark:bg-pink-900/20 dark:text-pink-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-gray-400">{store.minOrder}</span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-pink-600 hover:to-orange-500 sm:w-auto"
          >
            {hovered ? "View Menu" : "Open Local Shop"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
