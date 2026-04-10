import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  BellRing,
  Clock3,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { menuItems } from "../data/menu";
import { useCart } from "../context/CartContext";
import { db } from "../firebase/firebaseConfig";
import { getShopById } from "../data/shops";
import { getApiUrl } from "../utils/apiBaseUrl";
import { getMenuAvailabilityState } from "../utils/shopMenuAvailability";
import MenuItemCard from "./MenuItemCard";

export default function ShopDetails() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [shopConnectReady, setShopConnectReady] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [opsState, setOpsState] = useState({
    announcement: "",
    menuOverrides: {},
    security: null,
    updatedAt: null,
  });
  const [liveOpsState, setLiveOpsState] = useState(null);

  const categories = ["all", "cakes", "snacks", "pastries"];
  const shopMeta = getShopById(shopId);

  useEffect(() => {
    let isMounted = true;

    fetch(getApiUrl("/api/health"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Backend offline");
        }

        const payload = await response.json();
        if (isMounted) {
          setShopConnectReady(Boolean(payload?.features?.shopConnect));
        }
      })
      .catch(() => {
        if (isMounted) {
          setShopConnectReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shopConnectReady || !shopId) {
      setOpsState({
        announcement: "",
        menuOverrides: {},
        security: null,
      });
      setLastSyncAt(null);
      return undefined;
    }

    let isMounted = true;

    const loadOpsState = async () => {
      try {
        const response = await fetch(getApiUrl(`/api/shop-connect/${shopId}`));
        if (!response.ok) {
          throw new Error("Could not load shop operations state.");
        }
        const payload = await response.json();
        if (isMounted) {
          setOpsState({
            announcement: payload.announcement || "",
            menuOverrides: payload.menuOverrides || {},
            security: payload.security || null,
            updatedAt: payload.updatedAt || null,
          });
          setLastSyncAt(new Date());
        }
      } catch {
        if (isMounted) {
          setOpsState({
            announcement: "",
            menuOverrides: {},
            security: null,
            updatedAt: null,
          });
        }
      }
    };

    loadOpsState();
    const intervalId = window.setInterval(loadOpsState, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [shopConnectReady, shopId]);

  useEffect(() => {
    if (!shopId) {
      setLiveOpsState(null);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "shopLiveState", shopId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setLiveOpsState(null);
          return;
        }

        const data = snapshot.data();
        setLiveOpsState({
          announcement: data.announcement || "",
          menuOverrides: data.menuOverrides || {},
          security: data.security || null,
          updatedAt:
            typeof data.updatedAtClient === "string"
              ? data.updatedAtClient
              : data.updatedAt?.toDate?.()?.toISOString?.() || null,
        });
      },
      () => {
        setLiveOpsState(null);
      }
    );

    return unsubscribe;
  }, [shopId]);

  const effectiveOpsState = useMemo(() => {
    const liveUpdatedAt = liveOpsState?.updatedAt ? Date.parse(liveOpsState.updatedAt) : 0;
    const backendUpdatedAt = opsState?.updatedAt ? Date.parse(opsState.updatedAt) : 0;
    const useLiveState = liveUpdatedAt >= backendUpdatedAt;

    const primaryState = useLiveState && liveOpsState ? liveOpsState : opsState;
    const secondaryState = useLiveState ? opsState : liveOpsState;

    return {
      announcement: primaryState?.announcement || secondaryState?.announcement || "",
      menuOverrides: {
        ...(secondaryState?.menuOverrides || {}),
        ...(primaryState?.menuOverrides || {}),
      },
      security: primaryState?.security || secondaryState?.security || null,
      updatedAt: primaryState?.updatedAt || secondaryState?.updatedAt || null,
      realtimeConnected: Boolean(liveOpsState),
    };
  }, [liveOpsState, opsState]);

  const filteredItems = useMemo(
    () =>
      menuItems
        .filter(
          (item) =>
            item.shop?.toLowerCase() === shopId?.toLowerCase() &&
            (selectedCategory === "all" || item.category === selectedCategory)
        )
        .map((item) => {
          const override = effectiveOpsState.menuOverrides?.[item.id] || {};
          const stockCount =
            typeof override.stockCount === "number" ? override.stockCount : null;
          const inStock =
            typeof override.inStock === "boolean"
              ? override.inStock
              : stockCount === null
                ? true
                : stockCount > 0;

          return {
            ...item,
            ...override,
            price:
              typeof override.price === "number" && override.price >= 0
                ? override.price
                : item.price,
            prepTime:
              typeof override.prepTime === "number" && override.prepTime >= 0
                ? override.prepTime
                : 20,
            stockCount,
            inStock,
            availabilityState: getMenuAvailabilityState(
              {
                ...item,
                ...override,
                stockCount,
                inStock,
              },
              Date.now()
            ),
          };
        })
        .filter((item) => item.availabilityState.visible),
    [effectiveOpsState.menuOverrides, selectedCategory, shopId]
  );

  const hiddenItems = useMemo(
    () =>
      menuItems
        .filter((item) => item.shop?.toLowerCase() === shopId?.toLowerCase())
        .map((item) => {
          const override = effectiveOpsState.menuOverrides?.[item.id] || {};
          const stockCount =
            typeof override.stockCount === "number" ? override.stockCount : null;
          const inStock =
            typeof override.inStock === "boolean"
              ? override.inStock
              : stockCount === null
                ? true
                : stockCount > 0;

          return {
            ...item,
            ...override,
            stockCount,
            inStock,
            availabilityState: getMenuAvailabilityState(
              {
                ...item,
                ...override,
                stockCount,
                inStock,
              },
              Date.now()
            ),
          };
        })
        .filter((item) => !item.availabilityState.visible),
    [effectiveOpsState.menuOverrides, shopId]
  );

  const liveStats = useMemo(() => {
    const availableCount = filteredItems.filter((item) => item.inStock !== false).length;
    const lowStockCount = filteredItems.filter(
      (item) => Number(item.stockCount || 0) > 0 && Number(item.stockCount || 0) <= 3
    ).length;

    return [
      {
        label: "Live items",
        value: filteredItems.length,
        caption: `${availableCount} ready to order now`,
      },
      {
        label: "Auto refresh",
        value: effectiveOpsState.realtimeConnected ? "Live" : shopConnectReady ? "15s" : "Manual",
        caption: effectiveOpsState.realtimeConnected
          ? "Shop changes mirror instantly"
          : shopConnectReady
            ? "Backend polling stays active"
            : "Backend not connected for live sync",
      },
      {
        label: "Stock alerts",
        value: lowStockCount,
        caption: lowStockCount ? "Low-stock items highlighted" : "No urgent stock warnings",
      },
      {
        label: "Hidden items",
        value: hiddenItems.length,
        caption: hiddenItems.length ? "Restock or schedule controls are active" : "Everything visible right now",
      },
    ];
  }, [effectiveOpsState.realtimeConnected, filteredItems, hiddenItems.length, shopConnectReady]);

  const syncLabel = effectiveOpsState.updatedAt
    ? new Date(effectiveOpsState.updatedAt).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
      })
    : lastSyncAt
      ? lastSyncAt.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Waiting for first sync";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#fff7f5_0%,#ffffff_42%,#fffaf2_100%)] pb-36 pt-24 text-black dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#050816_0%,#0f172a_48%,#111827_100%)] dark:text-white">
      <div className="page-container space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(30,41,59,0.9))] p-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.16)]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-5%] top-[-10%] h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="absolute right-[-2%] top-6 h-44 w-44 rounded-full bg-orange-400/20 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-pink-100">
                <Sparkles className="h-4 w-4" />
                Local shop menu
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                  {shopMeta.name}
                </h2>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-pink-100/80">
                  {shopMeta.localName}
                </p>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-200">
                {shopMeta.subtitle}
              </p>

              <div className="flex flex-wrap gap-3">
                {shopMeta.priceRange ? (
                  <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                    {shopMeta.priceRange}
                  </span>
                ) : null}
                <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                  {shopMeta.deliveryTime}
                </span>
                <span className="inline-flex rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-100 backdrop-blur">
                  {shopMeta.minOrder}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {liveStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black">{stat.value}</p>
                  <p className="mt-2 text-sm text-white/70">{stat.caption}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Rating
              </p>
              <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                {shopMeta.rating} ({shopMeta.reviews})
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Shop type
              </p>
              <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                {shopMeta.type}
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Live sync
              </p>
              <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                {syncLabel}
              </p>
            </div>
          </div>

          <a
            href={shopMeta.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:translate-y-[-1px] dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-100"
          >
            <MapPinned className="h-4 w-4" />
            Open in Google Maps
          </a>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Store address
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-900 dark:text-white">
                  {shopMeta.address}
                </p>
              </div>
              <div className="inline-flex rounded-2xl bg-slate-950 px-3 py-3 text-white dark:bg-white dark:text-slate-950">
                <Clock3 className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-200">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Live from store desk
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Menu price, stock count, prep time, hidden-until scheduling, and fresh item images all surface here from the store desk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {effectiveOpsState.announcement ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[1.8rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,247,237,0.98))] px-5 py-4 text-sm font-medium text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
          >
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-300">
                  Store announcement
                </p>
                <p className="mt-2 leading-7">{effectiveOpsState.announcement}</p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {effectiveOpsState.security ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Customer code
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {effectiveOpsState.security.customerCodeRequired ? "Required at handoff" : "Currently relaxed"}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-sky-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Partner verification
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {effectiveOpsState.security.partnerVerificationRequired ? "Verified partner flow" : "Basic flow"}
              </p>
            </div>
            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-pink-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Proof capture
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {effectiveOpsState.security.proofCaptureRequired ? "Pickup and delivery proof enabled" : "Proof optional"}
              </p>
            </div>
          </div>
        ) : null}

        {hiddenItems.length ? (
          <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Hidden for now
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {hiddenItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.3rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950/45"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.availabilityState.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-[0_12px_24px_rgba(244,114,182,0.25)]"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-pink-200 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAdd={addToCart} />
            ))
          ) : (
            <div className="col-span-full rounded-[2rem] border border-slate-200/80 bg-white/85 p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/55">
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                No items in this category
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Try another category or wait for the store desk to publish fresh updates.
              </p>
            </div>
          )}
        </div>

        {cart.length > 0 ? (
          <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 flex w-[94%] max-w-xl -translate-x-1/2 justify-center md:bottom-5">
            <button
              type="button"
              className="pointer-events-auto flex w-full items-center justify-between rounded-[1.7rem] border border-white/70 bg-[linear-gradient(135deg,rgba(244,114,182,0.95),rgba(251,146,60,0.95))] px-5 py-4 text-sm font-semibold text-white shadow-[0_22px_40px_rgba(244,114,182,0.3)] backdrop-blur"
              onClick={() => navigate("/cart")}
            >
              <span>Go to Cart</span>
              <span>{cart.reduce((sum, item) => sum + item.quantity, 0)} items</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
