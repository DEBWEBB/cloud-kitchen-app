import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  BellRing,
  Boxes,
  CheckCircle2,
  Filter,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { menuItems } from "../data/menu";
import { shopCatalogById } from "../data/shops";
import { getApiUrl } from "../utils/apiBaseUrl";

const SHOP_LABELS = {
  mio: shopCatalogById.mio.name,
  monginis: shopCatalogById.monginis.name,
};

const inputClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default function ShopConnect() {
  const { user } = useAuth();
  const [selectedShop, setSelectedShop] = useState("mio");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [shopConnectReady, setShopConnectReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [menuOverrides, setMenuOverrides] = useState({});
  const [security, setSecurity] = useState({
    customerCodeRequired: true,
    partnerVerificationRequired: true,
    proofCaptureRequired: true,
  });
  const [orders, setOrders] = useState([]);
  const [verifications, setVerifications] = useState({});
  const [loadingState, setLoadingState] = useState(true);
  const [refreshingState, setRefreshingState] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("all");

  useEffect(() => {
    let isMounted = true;

    fetch(getApiUrl("/api/health"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Backend offline");
        }

        const payload = await response.json();
        if (!isMounted) return;

        setBackendStatus("online");
        setShopConnectReady(Boolean(payload?.features?.shopConnect));
      })
      .catch(() => {
        if (!isMounted) return;
        setBackendStatus("offline");
        setShopConnectReady(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shopConnectReady) {
      setLoadingState(false);
      setAnnouncement("");
      setMenuOverrides({});
      setVerifications({});
      return undefined;
    }

    let isMounted = true;

    const loadShopState = async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshingState(true);
        } else {
          setLoadingState(true);
        }
        const [stateResponse, verificationResponse] = await Promise.all([
          fetch(getApiUrl(`/api/shop-connect/${selectedShop}`)),
          fetch(getApiUrl(`/api/shop-connect/${selectedShop}/verifications`)),
        ]);

        if (!stateResponse.ok || !verificationResponse.ok) {
          throw new Error("Could not load shop operations state.");
        }

        const statePayload = await stateResponse.json();
        const verificationPayload = await verificationResponse.json();

        if (!isMounted) return;

        setAnnouncement(statePayload.announcement || "");
        setMenuOverrides(statePayload.menuOverrides || {});
        setSecurity(
          statePayload.security || {
            customerCodeRequired: true,
            partnerVerificationRequired: true,
            proofCaptureRequired: true,
          }
        );
        setVerifications(verificationPayload.verifications || {});
      } catch (error) {
        if (isMounted) {
          if (!silent) {
            toast.error(error.message || "Could not load shop connect state.");
          }
        }
      } finally {
        if (isMounted) {
          if (silent) {
            setRefreshingState(false);
          } else {
            setLoadingState(false);
          }
        }
      }
    };

    loadShopState();
    const intervalId = window.setInterval(() => loadShopState({ silent: true }), 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [selectedShop, shopConnectReady]);

  useEffect(() => {
    const orderQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      orderQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((order) => (order.store || "").toLowerCase() === selectedShop)
          .slice(0, 8);
        setOrders(nextOrders);
      },
      (error) => {
        console.error("ShopConnect order listener failed:", error);
        setOrders([]);
      }
    );

    return unsubscribe;
  }, [selectedShop]);

  const mergedMenu = useMemo(
    () =>
      menuItems
        .filter((item) => item.shop === selectedShop)
        .map((item) => {
          const override = menuOverrides[item.id] || {};
          return {
            ...item,
            ...override,
            price:
              typeof override.price === "number" && override.price >= 0
                ? override.price
                : item.price,
            stockCount:
              typeof override.stockCount === "number" && override.stockCount >= 0
                ? override.stockCount
                : 10,
            prepTime:
              typeof override.prepTime === "number" && override.prepTime >= 0
                ? override.prepTime
                : 20,
            inStock:
              typeof override.inStock === "boolean" ? override.inStock : true,
            note: override.note || "",
            autoHideWhenOutOfStock: Boolean(override.autoHideWhenOutOfStock),
            availableAgainAt: override.availableAgainAt || "",
            image: override.image || item.image,
          };
        }),
    [menuOverrides, selectedShop]
  );

  const menuCategories = useMemo(
    () => [
      "all",
      ...new Set(mergedMenu.map((item) => item.category).filter(Boolean)),
    ],
    [mergedMenu]
  );

  const visibleMenu = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();

    return mergedMenu.filter((item) => {
      const matchesCategory =
        menuCategory === "all" ? true : item.category === menuCategory;
      const matchesSearch = query
        ? [item.name, item.category, item.note]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        : true;

      return matchesCategory && matchesSearch;
    });
  }, [menuCategory, menuSearch, mergedMenu]);

  const overviewStats = useMemo(() => {
    const lowStockCount = mergedMenu.filter(
      (item) => Number(item.stockCount || 0) > 0 && Number(item.stockCount || 0) <= 3
    ).length;
    const outOfStockCount = mergedMenu.filter((item) => !item.inStock || Number(item.stockCount || 0) === 0).length;
    const verifiedCount = orders.filter((order) => verifications[order.id]?.shopVerified).length;
    const pickupReadyCount = orders.filter(
      (order) =>
        Boolean(verifications[order.id]?.shopVerified) &&
        (!security.partnerVerificationRequired || Boolean(order.partnerVerified))
    ).length;

    return [
      {
        label: "Live menu items",
        value: mergedMenu.length,
        caption: `${lowStockCount} low stock, ${outOfStockCount} paused`,
      },
      {
        label: "Verification queue",
        value: orders.length,
        caption: `${verifiedCount} shop-verified orders`,
      },
      {
        label: "Pickup secure",
        value: pickupReadyCount,
        caption: security.proofCaptureRequired ? "Proof required before handoff" : "Proof optional",
      },
      {
        label: "Security layers",
        value: Object.values(security).filter(Boolean).length,
        caption: "Customer, shop, and delivery protections",
      },
    ];
  }, [mergedMenu, orders, security, verifications]);

  const updateLocalMenuOverride = (itemId, patch) => {
    setMenuOverrides((current) => ({
      ...current,
      [itemId]: {
        ...current[itemId],
        ...patch,
      },
    }));
  };

  const publishLiveState = async ({
    nextAnnouncement = announcement,
    nextMenuOverrides = menuOverrides,
    nextSecurity = security,
  } = {}) => {
    try {
      await setDoc(
        doc(db, "shopLiveState", selectedShop),
        {
          shopId: selectedShop,
          announcement: nextAnnouncement,
          menuOverrides: nextMenuOverrides,
          security: nextSecurity,
          updatedAt: serverTimestamp(),
          updatedAtClient: new Date().toISOString(),
          updatedBy: user?.email || user?.uid || "",
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Could not publish live shop state:", error);
    }
  };

  const withAdminHeaders = async () => {
    const token = await user?.getIdToken?.();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const saveAnnouncement = async () => {
    if (!shopConnectReady) {
      toast.error("Shop Connect is unavailable until the backend is restarted.");
      return;
    }
    try {
      setSavingKey("announcement");
      const response = await fetch(getApiUrl(`/api/shop-connect/${selectedShop}/announcement`), {
        method: "POST",
        headers: await withAdminHeaders(),
        body: JSON.stringify({ announcement }),
      });
        if (!response.ok) {
          throw new Error("Could not save announcement.");
        }
        await publishLiveState({ nextAnnouncement: announcement });
        toast.success("Shop announcement updated.");
    } catch (error) {
      toast.error(error.message || "Could not save announcement.");
    } finally {
      setSavingKey("");
    }
  };

  const saveSecurity = async () => {
    if (!shopConnectReady) {
      toast.error("Shop Connect is unavailable until the backend is restarted.");
      return;
    }
    try {
      setSavingKey("security");
      const response = await fetch(getApiUrl(`/api/shop-connect/${selectedShop}/security`), {
        method: "POST",
        headers: await withAdminHeaders(),
        body: JSON.stringify(security),
      });
        if (!response.ok) {
          throw new Error("Could not save security controls.");
        }
        await publishLiveState({ nextSecurity: security });
        toast.success("Security rules saved.");
    } catch (error) {
      toast.error(error.message || "Could not save security rules.");
    } finally {
      setSavingKey("");
    }
  };

  const saveMenuItem = async (item) => {
    if (!shopConnectReady) {
      toast.error("Shop Connect is unavailable until the backend is restarted.");
      return;
    }
    try {
      setSavingKey(item.id);
        const response = await fetch(getApiUrl(`/api/shop-connect/${selectedShop}/menu`), {
          method: "POST",
          headers: await withAdminHeaders(),
          body: JSON.stringify({
            itemId: item.id,
            price: Number(item.price),
            stockCount: Number(item.stockCount),
            prepTime: Number(item.prepTime),
            inStock: Boolean(item.inStock),
            note: item.note || "",
            image: item.image || "",
            autoHideWhenOutOfStock: Boolean(item.autoHideWhenOutOfStock),
            availableAgainAt: item.availableAgainAt || "",
          }),
        });
        if (!response.ok) {
          throw new Error("Could not save menu item.");
        }
        const payload = await response.json();
        const nextOverrides = {
          ...menuOverrides,
          [item.id]: payload.item,
        };
        setMenuOverrides(nextOverrides);
        await publishLiveState({ nextMenuOverrides: nextOverrides });
        toast.success(`${item.name} updated.`);
    } catch (error) {
      toast.error(error.message || "Could not save menu item.");
    } finally {
      setSavingKey("");
    }
  };

  const uploadMenuImage = async (item, file) => {
    if (!shopConnectReady) {
      toast.error("Shop Connect is unavailable until the backend is restarted.");
      return;
    }

    if (!file) {
      return;
    }

    try {
      setSavingKey(`${item.id}:image`);
      const imageData = await fileToDataUrl(file);
      const response = await fetch(
        getApiUrl(`/api/shop-connect/${selectedShop}/menu-image`),
        {
          method: "POST",
          headers: await withAdminHeaders(),
          body: JSON.stringify({
            itemId: item.id,
            imageData,
          }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Could not upload menu image.");
      }

      const payload = await response.json();
      const nextOverrides = {
        ...menuOverrides,
        [item.id]: payload.item,
      };
      setMenuOverrides(nextOverrides);
      await publishLiveState({ nextMenuOverrides: nextOverrides });
      toast.success(`${item.name} image updated.`);
    } catch (error) {
      toast.error(error.message || "Could not upload menu image.");
    } finally {
      setSavingKey("");
    }
  };

  const saveVisibleItems = async () => {
    if (!visibleMenu.length) {
      toast.error("No visible menu items to save.");
      return;
    }

    try {
      setSavingKey("save-visible");
      for (const item of visibleMenu) {
        const response = await fetch(getApiUrl(`/api/shop-connect/${selectedShop}/menu`), {
          method: "POST",
          headers: await withAdminHeaders(),
          body: JSON.stringify({
            itemId: item.id,
            price: Number(item.price),
            stockCount: Number(item.stockCount),
            prepTime: Number(item.prepTime),
            inStock: Boolean(item.inStock),
            note: item.note || "",
            image: item.image || "",
            autoHideWhenOutOfStock: Boolean(item.autoHideWhenOutOfStock),
            availableAgainAt: item.availableAgainAt || "",
          }),
        });

        if (!response.ok) {
          throw new Error(`Could not save ${item.name}.`);
        }

        const payload = await response.json();
        setMenuOverrides((current) => ({
          ...current,
          [item.id]: payload.item,
        }));
      }

      const nextOverrides = visibleMenu.reduce(
        (accumulator, item) => ({
          ...accumulator,
          [item.id]: {
            ...accumulator[item.id],
            ...item,
          },
        }),
        { ...menuOverrides }
      );
      await publishLiveState({ nextMenuOverrides: nextOverrides });
      toast.success(`Saved ${visibleMenu.length} visible menu items.`);
    } catch (error) {
      toast.error(error.message || "Could not save visible items.");
    } finally {
      setSavingKey("");
    }
  };

  const toggleVerification = async (order) => {
    if (!shopConnectReady) {
      toast.error("Shop Connect is unavailable until the backend is restarted.");
      return;
    }
    const current = verifications[order.id];
    try {
      setSavingKey(order.id);
      const response = await fetch(getApiUrl(`/api/shop-connect/${selectedShop}/order-verify`), {
        method: "POST",
        headers: await withAdminHeaders(),
        body: JSON.stringify({
          orderId: order.id,
          shopVerified: !current?.shopVerified,
          packedNote: current?.packedNote || "Packed and verified by shop team.",
        }),
      });
      if (!response.ok) {
        throw new Error("Could not update verification state.");
      }
      const payload = await response.json();
      setVerifications((existing) => ({
        ...existing,
        [order.id]: payload.verification,
      }));
      toast.success(
        payload.verification.shopVerified
          ? "Order marked as shop-verified."
          : "Shop verification cleared."
      );
    } catch (error) {
      toast.error(error.message || "Could not update verification.");
    } finally {
      setSavingKey("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="page-container space-y-6 pb-24">
        <section className="card overflow-hidden rounded-[30px] border-white/60 bg-white/80 p-6 backdrop-blur dark:border-white/10 dark:bg-gray-900/75 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <span className="chip inline-flex bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                Shop Connect
              </span>
              <h1 className="mt-4 text-4xl font-black tracking-tight">Backend-linked shop operations</h1>
              <p className="muted mt-4 max-w-2xl text-base leading-7">
                Organize menu updates, stock controls, backend notices, and
                delivery verification in one secure control surface for shops.
              </p>
            </div>

            <div className="grid min-w-full gap-3 md:grid-cols-3 xl:min-w-[460px]">
              <SecurityTile
                number="01"
                icon={ShieldCheck}
                title="Customer security"
                text="Customer code, structured notices, and protected handoff flow."
              />
              <SecurityTile
                number="02"
                icon={Store}
                title="Shop security"
                text="Stock locks, menu overrides, and verified packing checkpoints."
              />
              <SecurityTile
                number="03"
                icon={Truck}
                title="Delivery security"
                text="Partner verification plus pickup and delivery proof awareness."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="muted uppercase tracking-[0.2em]">Operations state</p>
                  <h2 className="mt-2 text-2xl font-bold">Shop backend link</h2>
                </div>
                <span
                  className={`chip ${
                    backendStatus === "online"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                  }`}
                >
                  {backendStatus === "online" ? "Backend online" : "Backend offline"}
                </span>
              </div>

              <div className="mt-5">
                <label htmlFor="shop_connect_active_shop" className="mb-2 block text-sm font-medium">
                  Active shop
                </label>
                <select
                  id="shop_connect_active_shop"
                  name="shop_connect_active_shop"
                  value={selectedShop}
                  onChange={(event) => setSelectedShop(event.target.value)}
                  className={inputClassName}
                >
                  {Object.entries(SHOP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {!shopConnectReady ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  Shop Connect routes are not active on the running backend yet. Restart the backend to enable menu sync, stock updates, and verification controls.
                </div>
              ) : null}

              <div className="mt-5">
                <label htmlFor="shop_connect_announcement" className="mb-2 block text-sm font-medium">
                  Shop notice for customers
                </label>
                <textarea
                  id="shop_connect_announcement"
                  name="shop_connect_announcement"
                  rows={4}
                  value={announcement}
                  onChange={(event) => setAnnouncement(event.target.value)}
                  className={inputClassName}
                  placeholder="Ex: Fresh truffle batch arrives at 6 PM. Pastry stock is limited."
                />
                <button
                  onClick={saveAnnouncement}
                  disabled={!shopConnectReady}
                  className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingKey === "announcement" ? "Saving..." : "Publish notice"}
                </button>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-pink-500" size={20} />
                <div>
                  <h2 className="text-2xl font-bold">Security controls</h2>
                  <p className="muted mt-1">
                    Numbered protections for customer, shop, and delivery flow.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <SecurityToggle
                  label="1. Require customer confirmation code"
                  checked={security.customerCodeRequired}
                  onChange={(checked) =>
                    setSecurity((current) => ({ ...current, customerCodeRequired: checked }))
                  }
                />
                <SecurityToggle
                  label="2. Require verified delivery partner"
                  checked={security.partnerVerificationRequired}
                  onChange={(checked) =>
                    setSecurity((current) => ({
                      ...current,
                      partnerVerificationRequired: checked,
                    }))
                  }
                />
                <SecurityToggle
                  label="3. Require pickup and delivery proof"
                  checked={security.proofCaptureRequired}
                  onChange={(checked) =>
                    setSecurity((current) => ({ ...current, proofCaptureRequired: checked }))
                  }
                />
              </div>

              <button
                onClick={saveSecurity}
                disabled={!shopConnectReady}
                className="btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey === "security" ? "Saving..." : "Save security rules"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewStats.map((stat) => (
                <div
                  key={stat.label}
                  className="card rounded-[28px] border-white/70 bg-white/85 p-5 backdrop-blur dark:border-white/10 dark:bg-gray-900/75"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="muted mt-2">{stat.caption}</p>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <Boxes className="text-orange-500" size={20} />
                <div>
                  <h2 className="text-2xl font-bold">Menu and stock organizer</h2>
                  <p className="muted mt-1">
                    Search quickly, filter by category, then update the visible menu in one compact desk.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      placeholder="Search menu items, notes, or category"
                      className={`${inputClassName} pl-11`}
                    />
                  </label>

                  <label className="relative block">
                    <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      value={menuCategory}
                      onChange={(event) => setMenuCategory(event.target.value)}
                      className={`${inputClassName} pl-11`}
                    >
                      {menuCategories.map((category) => (
                        <option key={category} value={category}>
                          {category === "all" ? "All categories" : category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={saveVisibleItems}
                    disabled={!shopConnectReady || !visibleMenu.length || savingKey === "save-visible"}
                    className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingKey === "save-visible" ? "Saving..." : `Save ${visibleMenu.length} shown`}
                  </button>

                  <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    <RefreshCw
                      size={16}
                      className={`mr-2 ${refreshingState ? "animate-spin text-pink-500" : "text-gray-400"}`}
                    />
                    {refreshingState ? "Refreshing quietly" : "Auto-sync stays in place"}
                  </div>
                </div>
              </div>

              {loadingState ? (
                <div className="mt-6 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="animate-spin" size={16} />
                  Loading shop controls...
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Showing {visibleMenu.length} of {mergedMenu.length} menu items for {SHOP_LABELS[selectedShop]}.
                    </p>
                    {menuSearch || menuCategory !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuSearch("");
                          setMenuCategory("all");
                        }}
                        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 transition hover:border-pink-300 hover:text-pink-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                  {visibleMenu.map((item) => (
                    <div key={item.id} className="rounded-[28px] border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/60">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="muted mt-1 capitalize">{item.category}</p>
                        </div>
                        <span className={`chip ${item.inStock ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"}`}>
                          {item.inStock ? "In stock" : "Out of stock"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`${item.id}_image`}
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
                          >
                            Menu image
                          </label>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                              {item.image ? (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                  No image
                                </div>
                              )}
                            </div>
                            <label
                              htmlFor={`${item.id}_image`}
                              className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-pink-300 hover:text-pink-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                            >
                              {savingKey === `${item.id}:image`
                                ? "Uploading..."
                                : "Upload fresh image"}
                            </label>
                            <input
                              id={`${item.id}_image`}
                              name={`${item.id}_image`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) =>
                                uploadMenuImage(item, event.target.files?.[0])
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor={`${item.id}_price`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                            Price
                          </label>
                          <input
                            id={`${item.id}_price`}
                            name={`${item.id}_price`}
                            type="number"
                            className={inputClassName}
                            value={item.price}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, { price: Number(event.target.value) })
                            }
                            placeholder="Price"
                          />
                        </div>
                        <div>
                          <label htmlFor={`${item.id}_stock`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                            Stock
                          </label>
                          <input
                            id={`${item.id}_stock`}
                            name={`${item.id}_stock`}
                            type="number"
                            className={inputClassName}
                            value={item.stockCount}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, { stockCount: Number(event.target.value) })
                            }
                            placeholder="Stock"
                          />
                        </div>
                        <div>
                          <label htmlFor={`${item.id}_prep_time`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                            Prep time
                          </label>
                          <input
                            id={`${item.id}_prep_time`}
                            name={`${item.id}_prep_time`}
                            type="number"
                            className={inputClassName}
                            value={item.prepTime}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, { prepTime: Number(event.target.value) })
                            }
                            placeholder="Prep time"
                          />
                        </div>
                        <label htmlFor={`${item.id}_available`} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900">
                          <input
                            id={`${item.id}_available`}
                            name={`${item.id}_available`}
                            type="checkbox"
                            checked={Boolean(item.inStock)}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, { inStock: event.target.checked })
                            }
                          />
                          Keep item available
                        </label>
                        <label
                          htmlFor={`${item.id}_auto_hide`}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-900"
                        >
                          <input
                            id={`${item.id}_auto_hide`}
                            name={`${item.id}_auto_hide`}
                            type="checkbox"
                            checked={Boolean(item.autoHideWhenOutOfStock)}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, {
                                autoHideWhenOutOfStock: event.target.checked,
                              })
                            }
                          />
                          Auto-hide when sold out
                        </label>
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`${item.id}_available_again`}
                            className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500"
                          >
                            Available again at
                          </label>
                          <input
                            id={`${item.id}_available_again`}
                            name={`${item.id}_available_again`}
                            type="datetime-local"
                            className={inputClassName}
                            value={toDateTimeLocalValue(item.availableAgainAt)}
                            onChange={(event) =>
                              updateLocalMenuOverride(item.id, {
                                availableAgainAt: event.target.value
                                  ? new Date(event.target.value).toISOString()
                                  : "",
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label htmlFor={`${item.id}_note`} className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                          Operational note
                        </label>
                        <textarea
                          id={`${item.id}_note`}
                          name={`${item.id}_note`}
                          rows={3}
                          className={inputClassName}
                          value={item.note || ""}
                          onChange={(event) =>
                            updateLocalMenuOverride(item.id, { note: event.target.value })
                          }
                          placeholder="Operational note: low stock, fresh batch at 5 PM, etc."
                        />
                      </div>

                      <button
                        onClick={() => saveMenuItem(item)}
                        disabled={!shopConnectReady}
                        className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingKey === item.id ? "Saving..." : "Save item update"}
                      </button>
                    </div>
                  ))}
                  </div>
                  {!visibleMenu.length ? (
                    <div className="rounded-[28px] border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      No menu items match your current search. Try another keyword or clear the filters.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <PackageCheck className="text-cyan-500" size={20} />
                <div>
                  <h2 className="text-2xl font-bold">Order verification queue</h2>
                  <p className="muted mt-1">
                    Organized checks before handoff to the delivery partner.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {orders.length ? (
                  orders.map((order, index) => {
                    const verification = verifications[order.id];
                    const numberedChecks = [
                      {
                        icon: BellRing,
                        label: "1. Customer code",
                        value:
                          order.secretCode || order.secretCodeProtected
                            ? "Issued"
                            : "Missing",
                        ok: Boolean(order.secretCode || order.secretCodeProtected),
                      },
                      {
                        icon: Truck,
                        label: "2. Partner verified",
                        value: order.partnerVerified ? "Verified" : "Pending",
                        ok: Boolean(order.partnerVerified),
                      },
                      {
                        icon: CheckCircle2,
                        label: "3. Pickup proof",
                        value: order.pickupProofUrl ? "Captured" : "Pending",
                        ok: Boolean(order.pickupProofUrl),
                      },
                      {
                        icon: ShieldCheck,
                        label: "4. Shop verify",
                        value: verification?.shopVerified ? "Verified" : "Pending",
                        ok: Boolean(verification?.shopVerified),
                      },
                    ];
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-[28px] border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/60"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              Order #{order.id.slice(-6).toUpperCase()}
                            </p>
                            <p className="muted mt-1">
                              {order.name || "Customer"} - Rs.{order.total || 0}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleVerification(order)}
                            disabled={!shopConnectReady}
                            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {savingKey === order.id
                              ? "Saving..."
                              : verification?.shopVerified
                                ? "Clear verify"
                                : "Verify pack"}
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {numberedChecks.map((check) => (
                            <QueueChip
                              key={check.label}
                              icon={check.icon}
                              label={check.label}
                              value={check.value}
                              ok={check.ok}
                            />
                          ))}
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="rounded-[28px] border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    No recent orders found for {SHOP_LABELS[selectedShop]}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SecurityTile({ number, icon: Icon, title, text }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-gray-950/55">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
          {number}
        </span>
        <Icon size={18} className="text-pink-500" />
      </div>
      <p className="mt-4 text-lg font-bold text-gray-900 dark:text-white">{title}</p>
      <p className="muted mt-2">{text}</p>
    </div>
  );
}

function SecurityToggle({ label, checked, onChange }) {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium dark:border-gray-800 dark:bg-gray-900/60">
      <label htmlFor={inputId} className="cursor-pointer">
        {label}
      </label>
      <input
        id={inputId}
        name={inputId}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

function QueueChip({ icon: Icon, label, value, ok }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-950/60">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        <Icon size={14} />
        {label}
      </div>
      <p className={`mt-2 text-sm font-bold ${ok ? "text-emerald-600 dark:text-emerald-300" : "text-gray-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}
