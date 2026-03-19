import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { motion } from "framer-motion";
import { Clock3, MapPinned, PackageCheck, Phone, Route } from "lucide-react";
import L from "leaflet";
import { db } from "../firebase/firebaseConfig";
import haversine from "../utils/haversineDistance";
import maskPhone from "../utils/maskPhone";
import "leaflet/dist/leaflet.css";

const deliveryIcon = new L.Icon({
  iconUrl: "/delivery-icon.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const statusSteps = [
  { id: "pending", label: "Order Placed" },
  { id: "picked", label: "Picked" },
  { id: "on the way", label: "On the Way" },
  { id: "delivered", label: "Delivered" },
];

const estimateEtaMinutes = (courierLocation, deliveryLocation, status) => {
  if (!courierLocation || !deliveryLocation) {
    return status === "delivered" ? 0 : 25;
  }

  const distanceKm = haversine(courierLocation, deliveryLocation);
  return Math.max(5, Math.round((distanceKm / 0.35) * 3));
};

export default function OrderTracker() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = onSnapshot(doc(db, "orders", orderId), (snapshot) => {
      setLoading(false);
      setOrder(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    });

    return () => unsubscribe();
  }, [orderId]);

  const courierLocation = order?.courierLocation || null;
  const deliveryLocation = order?.location || courierLocation || { lat: 22.5726, lng: 88.3639 };
  const mapCenter = courierLocation || deliveryLocation;
  const etaMinutes = useMemo(
    () => estimateEtaMinutes(courierLocation, deliveryLocation, order?.status),
    [courierLocation, deliveryLocation, order?.status]
  );

  if (loading) {
    return (
      <div className="page-container pt-28">
        <div className="card min-h-[320px] overflow-hidden p-8">
          <div className="space-y-4 animate-pulse">
            <div className="h-6 w-48 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-72 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-[320px] rounded-3xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container pt-28">
        <div className="card p-10 text-center">
          <p className="section-title mb-2 text-lg">No order found</p>
          <p className="muted">We could not find an active order for this tracking link.</p>
          <button className="btn-primary mt-6" onClick={() => navigate("/orders")}>
            Go to My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50 pt-24 text-black dark:bg-gray-950 dark:text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-container space-y-6">
        <section className="card overflow-hidden p-0">
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-6 text-white">
            <span className="chip inline-flex border border-white/20 bg-white/15 text-white">Live order tracking</span>
            <h1 className="mt-4 text-3xl font-bold">Track your order in real time</h1>
            <p className="mt-2 text-sm text-white/85">Order ID: <span className="font-mono">{orderId}</span></p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <PackageCheck size={16} />
                <span className="text-sm">Current status</span>
              </div>
              <p className="mt-2 text-lg font-semibold capitalize text-gray-900 dark:text-white">{order.status}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Clock3 size={16} />
                <span className="text-sm">Estimated ETA</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                {order.status === "delivered" ? "Delivered" : `${etaMinutes} min`}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Route size={16} />
                <span className="text-sm">Delivery charge</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">Rs.{order.deliveryCharge || 0}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Phone size={16} />
                <span className="text-sm">Courier contact</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{maskPhone(order.courierPhone)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Progress</h2>
            <div className="mt-6 space-y-4">
              {statusSteps.map((step, index) => {
                const currentIndex = statusSteps.findIndex((entry) => order.status?.toLowerCase() === entry.id);
                const complete = currentIndex >= index || order.status === "delivered";

                return (
                  <div key={step.id} className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                        complete
                          ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${complete ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                        {step.label}
                      </p>
                      <p className="muted mt-1">
                        {complete ? "Completed or active in the current delivery flow." : "Waiting for the next delivery update."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <MapPinned size={16} />
                <span className="text-sm">Delivery address</span>
              </div>
              <p className="mt-2 font-medium text-gray-900 dark:text-white">{order.address || "No address available"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="chip">{order.courierName || "Partner assigned shortly"}</span>
                <span className={`chip ${order.partnerVerified ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : ""}`}>
                  {order.partnerVerified ? "Verified partner" : "Verification pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Courier map</h2>
              <p className="muted mt-1">Map updates automatically when the delivery partner shares live location.</p>
            </div>
            <div className="h-[460px]">
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[deliveryLocation.lat, deliveryLocation.lng]}>
                  <Popup>Delivery destination</Popup>
                </Marker>
                {courierLocation && (
                  <Marker position={[courierLocation.lat, courierLocation.lng]} icon={deliveryIcon}>
                    <Popup>{order.courierName || "Courier"} is on the move</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
