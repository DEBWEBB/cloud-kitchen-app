import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock3,
  Copy,
  MapPinned,
  Navigation,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import L from "leaflet";
import { db } from "../firebase/firebaseConfig";
import { getStoreLocation } from "../utils/assignDeliveryPartner";
import maskPhone from "../utils/maskPhone";
import CustomerDeliveryLiveCard from "../components/CustomerDeliveryLiveCard";
import useRouteMetrics from "../hooks/useRouteMetrics";
import usePaymentGatewayStatus from "../hooks/usePaymentGatewayStatus";
import { revealOrderSecurityCode } from "../utils/orderSecurity";
import "leaflet/dist/leaflet.css";

const statusSteps = [
  { id: "pending", label: "Order placed" },
  { id: "picked", label: "Picked up" },
  { id: "on the way", label: "On the way" },
  { id: "delivered", label: "Delivered" },
];

const normalizeStatus = (status) => {
  const normalized = String(status || "pending").toLowerCase();
  return statusSteps.some((step) => step.id === normalized) || normalized === "cancelled"
    ? normalized
    : "pending";
};

const formatPlacedAt = (value) => {
  if (!value) return "Just now";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return String(value);
};

const buildMarkerIcon = (label, toneClass) =>
  L.divIcon({
    className: "",
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -36],
    html: `<div class="flex h-10 w-10 items-center justify-center rounded-2xl ${toneClass} text-xs font-bold text-white shadow-lg">${label}</div>`,
  });

const homeIcon = buildMarkerIcon("You", "bg-gradient-to-br from-slate-900 to-slate-700");
const courierIcon = buildMarkerIcon("Rider", "bg-gradient-to-br from-pink-500 to-orange-400");

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center?.lat && center?.lng) {
      map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 15), {
        duration: 1.1,
      });
    }
  }, [center?.lat, center?.lng, map]);

  return null;
}

export function OrderTrackerPanel({
  orderId: providedOrderId,
  embedded = false,
  onClose,
}) {
  const { orderId: routeOrderId } = useParams();
  const navigate = useNavigate();
  const orderId = providedOrderId || routeOrderId;
  const [order, setOrder] = useState(null);
  const [secretCode, setSecretCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { paymentStatus } = usePaymentGatewayStatus(orderId, Boolean(orderId), 15000);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("No order ID provided.");
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        setLoading(false);
        if (!snapshot.exists()) {
          setOrder(null);
          setError("Order not found.");
          return;
        }

        const data = snapshot.data();
        setOrder({ id: snapshot.id, ...data });
        if (data.secretCode) {
          setSecretCode(data.secretCode);
        } else if (data.secretCodeProtected) {
          revealOrderSecurityCode({ orderId: snapshot.id })
            .then((payload) => setSecretCode(payload.secretCode || ""))
            .catch(() => setSecretCode(""));
        } else {
          setSecretCode("");
        }
        setError(null);
      },
      (snapshotError) => {
        console.error("Order tracker listener failed:", snapshotError);
        setLoading(false);
        setError(snapshotError.message || "Could not load this order.");
      }
    );

    return unsubscribe;
  }, [orderId]);

  const normalizedStatus = normalizeStatus(order?.status);
  const courierLocation = order?.courierLocation || null;
  const storeLocation = useMemo(
    () => getStoreLocation(order?.store || "mio"),
    [order?.store]
  );
  const deliveryLocation = order?.location || null;
  const mapCenter = courierLocation || deliveryLocation || storeLocation;
  const routeMetrics = useRouteMetrics(
    courierLocation,
    deliveryLocation,
    Boolean(courierLocation && deliveryLocation && normalizedStatus !== "delivered"),
    15000
  );
  const etaMinutes =
    normalizedStatus === "delivered" ? 0 : routeMetrics.travelMinutes || 25;
  const progress = useMemo(() => {
    if (normalizedStatus === "cancelled") return 0;
    const stepIndex = statusSteps.findIndex((step) => step.id === normalizedStatus);
    return stepIndex === -1
      ? 12
      : Math.round(((stepIndex + 1) / statusSteps.length) * 100);
  }, [normalizedStatus]);
  const courierDistance =
    typeof routeMetrics.distanceKm === "number"
      ? routeMetrics.distanceKm.toFixed(1)
      : null;
  const routePath = useMemo(
    () =>
      Array.isArray(routeMetrics.geometry)
        ? routeMetrics.geometry.map((point) => [point.lat, point.lng])
        : [],
    [routeMetrics.geometry]
  );

  const copySecretCode = async () => {
    if (!secretCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(secretCode);
    } catch {}
  };

  if (loading) {
    return (
      <div className={embedded ? "" : "page-container pt-28"}>
        <div className="card overflow-hidden p-8">
          <div className="space-y-5 animate-pulse">
            <div className="h-6 w-48 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-12 w-80 rounded-[28px] bg-gray-200 dark:bg-gray-800" />
            <div className="h-[420px] rounded-[28px] bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <motion.div
        className={embedded ? "" : "page-container pt-28"}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="card rounded-[30px] border-red-200 bg-red-50/80 p-10 text-center dark:border-red-900 dark:bg-red-950/30">
          <p className="section-title text-red-600 dark:text-red-400">Order unavailable</p>
          <p className="muted mt-3">{error || "We could not load this tracker."}</p>
          <button onClick={() => navigate("/orders")} className="btn-primary mt-6">
            Back to Orders
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`text-gray-900 dark:text-white ${
        embedded
          ? ""
          : "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.12),_transparent_24%),linear-gradient(to_bottom,_#fff7f5,_#f8fafc_24%,_#f8fafc)] pt-24 dark:bg-gray-950"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className={`${embedded ? "space-y-6" : "page-container space-y-6 pb-24"}`}>
        <section className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.5)] backdrop-blur md:p-8 dark:border-white/10 dark:bg-gray-900/75">
          <div className="pointer-events-none absolute -left-10 top-0 h-56 w-56 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-pink-600 dark:border-pink-500/20 dark:bg-gray-900/70 dark:text-pink-300">
                <Sparkles size={14} />
                Live Delivery Tracker
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-950 md:text-5xl dark:text-white">
                Order #{order.id.slice(-6).toUpperCase()}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300 md:text-base">
                Monitor delivery movement, courier updates, confirmation code,
                and the route into your address from one place.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => (embedded && onClose ? onClose() : navigate("/orders"))}
                  className="btn-ghost"
                >
                  <ArrowLeft size={16} className="mr-2 inline-flex" />
                  Back to orders
                </button>
                {order?.courierPhone ? (
                  <a href={`tel:${order.courierPhone}`} className="btn-primary">
                    <Phone size={16} className="mr-2 inline-flex" />
                    Call rider
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid min-w-full gap-3 md:grid-cols-2 xl:min-w-[360px] xl:max-w-[380px]">
              <TrackerStat
                icon={PackageCheck}
                label="Status"
                value={normalizedStatus === "delivered" ? "Delivered" : order.status || "Pending"}
              />
              <TrackerStat
                icon={Clock3}
                label="ETA"
                value={normalizedStatus === "delivered" ? "Completed" : `${etaMinutes} min`}
              />
              <TrackerStat
                icon={Truck}
                label="Courier"
                value={order.courierName || "Assigning partner"}
              />
              <TrackerStat
                icon={Navigation}
                label="Distance"
                value={courierDistance ? `${courierDistance} km away` : "Tracking soon"}
              />
            </div>
          </div>

          {normalizedStatus === "delivered" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mt-6 overflow-hidden rounded-[28px] border border-emerald-200/80 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.24),_transparent_42%),linear-gradient(135deg,_rgba(236,253,245,0.95),_rgba(255,247,237,0.92))] p-5 shadow-[0_26px_60px_-40px_rgba(16,185,129,0.45)] dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_42%),linear-gradient(135deg,_rgba(6,78,59,0.4),_rgba(51,65,85,0.32))]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-300/30 blur-3xl" />
              <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <motion.div
                    initial={{ scale: 0.88, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 250, damping: 16 }}
                    className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg"
                  >
                    <PackageCheck size={26} />
                  </motion.div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700 dark:border-white/10 dark:bg-white/10 dark:text-emerald-300">
                      <Sparkles size={13} />
                      Order Completed
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-gray-950 dark:text-white">
                      Delivered successfully
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-200">
                      Your order has reached you safely, the route is closed, and the final proof record is available below.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoTile label="Final status" value="Handed off safely" />
                  <InfoTile label="Closure" value="Verified with secret code" />
                </div>
              </div>
            </motion.div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-6">
            <div className="card rounded-[30px] border-white/60 bg-white/75 p-6 backdrop-blur dark:border-white/10 dark:bg-gray-900/75">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Progress
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Delivery timeline</h2>
                </div>
                <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {progress}%
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
                />
              </div>

              <div className="mt-6 space-y-4">
                {statusSteps.map((step, index) => {
                  const currentStep = statusSteps.findIndex(
                    (current) => current.id === normalizedStatus
                  );
                  const isComplete = currentStep >= index || normalizedStatus === "delivered";

                  return (
                    <div key={step.id} className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold ${
                          isComplete
                            ? "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="pt-1">
                        <p className="font-semibold text-gray-900 dark:text-white">{step.label}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {isComplete ? "Completed" : "Pending"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card rounded-[30px] border-white/60 bg-white/75 p-6 backdrop-blur dark:border-white/10 dark:bg-gray-900/75">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Delivery intelligence
              </p>
              <div className="mt-4">
                <CustomerDeliveryLiveCard
                  order={order}
                  paymentStatus={paymentStatus}
                />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoTile label="Placed at" value={formatPlacedAt(order.createdAt)} />
                <InfoTile label="Store" value={order.storeName || order.store || "HungryBox"} />
                <InfoTile
                  label="Courier phone"
                  value={order.courierPhone ? maskPhone(order.courierPhone) : "Hidden until assigned"}
                />
                <InfoTile
                  label="Verification"
                  value={order.partnerVerified ? "Verified partner" : "Verification pending"}
                />
                <InfoTile
                  label="Payment"
                  value={order.paymentStatus || (order.paymentMethod === "COD" ? "Pending on delivery" : "Pending")}
                />
                <InfoTile
                  label="UPI reference"
                  value={order.paymentReference || "Not recorded"}
                />
                <InfoTile
                  label="Route basis"
                  value={routeMetrics.sourceLabel || "Waiting for live route"}
                />
              </div>

              <div className="mt-4 rounded-[26px] bg-gray-50 p-4 dark:bg-gray-800/70">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      Confirmation code
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-[0.24em] text-gray-950 dark:text-white">
                      {secretCode || "PENDING"}
                    </p>
                  </div>
                  <button onClick={copySecretCode} className="btn-ghost">
                    <Copy size={16} className="mr-2 inline-flex" />
                    Copy
                  </button>
                </div>
              </div>

              {order.deliveryDelayNotice ? (
                <div className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                  {order.deliveryDelayNotice}
                </div>
              ) : null}

              {(order.pickupProofUrl ||
                order.pickupSelfieUrl ||
                order.deliveryProofUrl ||
                order.deliverySelfieUrl) && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {order.pickupProofUrl && (
                    <ProofCard title="Pickup proof" src={order.pickupProofUrl} />
                  )}
                  {order.pickupSelfieUrl && (
                    <ProofCard title="Pickup selfie" src={order.pickupSelfieUrl} />
                  )}
                  {order.deliveryProofUrl && (
                    <ProofCard title="Delivery proof" src={order.deliveryProofUrl} />
                  )}
                  {order.deliverySelfieUrl && (
                    <ProofCard title="Delivery selfie" src={order.deliverySelfieUrl} />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card overflow-hidden rounded-[30px] border-white/60 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-gray-900/75">
              <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                      Route map
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">Real-time movement</h2>
                  </div>
                  <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {courierDistance
                      ? `${courierDistance} km • ${routeMetrics.sourceLabel || "Live estimate"}`
                      : "Awaiting route lock"}
                  </span>
                </div>
              </div>

              <div className="h-[460px] bg-gray-100 dark:bg-gray-800">
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <RecenterMap center={mapCenter} />
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {deliveryLocation ? (
                    <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={homeIcon}>
                      <Popup>Delivery destination</Popup>
                    </Marker>
                  ) : null}
                  {courierLocation && (
                    <Marker position={[courierLocation.lat, courierLocation.lng]} icon={courierIcon}>
                      <Popup>Courier location</Popup>
                    </Marker>
                  )}
                  {routePath.length >= 2 ? (
                    <Polyline
                      positions={routePath}
                      pathOptions={{
                        color: "#f97316",
                        weight: 5,
                        opacity: 0.8,
                      }}
                    />
                  ) : null}
                </MapContainer>
              </div>
            </div>

            <div className="card rounded-[30px] border-white/60 bg-white/75 p-6 backdrop-blur dark:border-white/10 dark:bg-gray-900/75">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Address and basket
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">What is arriving</h2>
                </div>
                {order.partnerVerified ? (
                  <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <ShieldCheck size={15} className="mr-2 inline-flex" />
                    Verified rider
                  </span>
                ) : null}
              </div>

              <div className="mt-5 rounded-[26px] bg-gray-50 p-4 dark:bg-gray-800/70">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  <MapPinned size={16} />
                  Delivery address
                </div>
                <p className="mt-3 text-base font-medium text-gray-900 dark:text-white">
                  {order.address || "Saved delivery address"}
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {(order.items || []).map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Qty {item.quantity || 1}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Rs.{Number(item.price || 0) * Number(item.quantity || 1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export default function OrderTracker() {
  return <OrderTrackerPanel />;
}

function TrackerStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[26px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-950/55">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
        <Icon size={16} />
        {label}
      </div>
      <p className="mt-3 text-lg font-bold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function ProofCard({ title, src }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <img src={src} alt={title} className="h-48 w-full object-cover" />
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      </div>
    </div>
  );
}
