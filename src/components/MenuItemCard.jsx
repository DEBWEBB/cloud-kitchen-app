import { motion } from "framer-motion";
import { Clock3, Sparkles, Zap } from "lucide-react";

const MenuItemCard = ({ item, onAdd }) => {
  const isOutOfStock = item.inStock === false || item.stockCount === 0;
  const hasLiveOverride =
    item.note ||
    (item.stockCount !== null && item.stockCount !== undefined) ||
    typeof item.prepTime === "number" ||
    Boolean(item.autoHideWhenOutOfStock) ||
    Boolean(item.availableAgainAt);

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(255,247,245,0.92))] shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.95),rgba(30,41,59,0.9))]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-pink-500/20 via-orange-400/10 to-cyan-400/20 blur-2xl" />
      </div>

      {item.image ? (
        <div className="relative overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/5 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              <Sparkles className="h-3.5 w-3.5" />
              {item.category}
            </span>
            {hasLiveOverride ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                Live menu
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div className="max-w-[72%]">
              <h3 className="text-xl font-black tracking-tight text-white">
                {item.name}
              </h3>
              <p className="mt-1 text-sm text-white/80">
                {isOutOfStock ? "Temporarily unavailable" : "Freshly prepared for local delivery"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-right shadow-lg backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Price
              </p>
              <p className="text-xl font-black text-slate-950">Rs.{item.price}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="relative space-y-4 p-5">
        <p className="min-h-[52px] text-sm leading-7 text-slate-600 dark:text-slate-300">
          {item.description}
        </p>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/45">
            <div className="flex flex-wrap gap-2">
              {isOutOfStock ? (
                <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                  Out of stock
                </span>
              ) : item.stockCount !== null && item.stockCount !== undefined ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {item.stockCount} left
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                  Available
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Clock3 className="h-4 w-4" />
              {isOutOfStock ? "Restock in progress" : `${item.prepTime || 20} min prep time`}
            </div>

            {item.note ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                {item.note}
              </p>
            ) : item.availabilityState?.reason === "low-stock" ? (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                {item.availabilityState.message}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Local store updates for price, stock, and prep time appear here automatically.
              </p>
            )}
          </div>

          <button
            className={`min-h-[58px] rounded-[1.4rem] px-5 text-sm font-semibold transition ${
              isOutOfStock
                ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 text-white shadow-[0_16px_30px_rgba(244,114,182,0.28)] hover:translate-y-[-1px]"
            }`}
            onClick={() => !isOutOfStock && onAdd(item)}
            disabled={isOutOfStock}
            type="button"
          >
            {isOutOfStock ? "Unavailable" : "Add to cart"}
          </button>
        </div>
      </div>
    </motion.article>
  );
};

export default MenuItemCard;
