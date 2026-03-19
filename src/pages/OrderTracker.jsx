import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";

const deliveryIcon = new L.Icon({
  iconUrl: "/delivery-icon.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const statusSteps = [
  "Order Placed",
  "Cooking",
  "Dispatched",
  "On the Way",
  "Delivered",
];

export default function OrderTracker() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [location, setLocation] = useState({ lat: 22.5726, lng: 88.3639 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      setLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder(data);
        if (data?.courierLocation) {
          setLocation(data.courierLocation);
        } else if (data?.location) {
          setLocation(data.location);
        }
      } else {
        setOrder(null);
      }
    });

    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Animation variants for status steps
  const stepVariants = {
    initial: { scale: 0.9, opacity: 0.5 },
    active: { scale: 1.1, opacity: 1, boxShadow: "0 0 12px #ec4899" },
    inactive: { scale: 1, opacity: 0.7 },
  };

  return (
    <motion.div
      className="min-h-screen p-6 pt-20 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-black text-black dark:text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
    >
      <motion.h1
        className="text-4xl font-extrabold mb-4 text-center text-pink-700 dark:text-pink-300 tracking-tight"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        📍 Live Order Tracking
      </motion.h1>
      <p className="text-center text-lg mb-6">
        Tracking Order ID: <span className="font-bold">{orderId}</span>
      </p>

      <AnimatePresence>
        {loading ? (
          <motion.div
            className="flex flex-col items-center mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              src="/loading-anim.gif"
              alt="Loading"
              className="w-32 h-32 mb-4"
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
            />
            <motion.p
              className="text-lg text-blue-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Loading your order data...
            </motion.p>
          </motion.div>
        ) : order ? (
          <>
            <motion.div
              className="mt-4 mb-6 space-y-2 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p>📦 <strong>Status:</strong> <span className="text-pink-600 dark:text-pink-400">{order.status}</span></p>
              <p>💰 <strong>Total:</strong> <span className="text-green-600 dark:text-green-400">₹{order.total}</span></p>
              <p>🚚 <strong>Delivery Partner:</strong> {order.courierName || "—"}</p>
              <p>📞 <strong>Phone:</strong> {order.courierPhone || "—"}</p>
            </motion.div>

            <motion.div
              className="flex justify-center items-center gap-4 mb-6 flex-wrap"
              initial="initial"
              animate="active"
            >
              {statusSteps.map((step, idx) => {
                const isActive = order?.status?.toLowerCase().includes(step.toLowerCase());
                return (
                  <motion.div
                    key={step}
                    variants={stepVariants}
                    initial="initial"
                    animate={isActive ? "active" : "inactive"}
                    transition={{ duration: 0.3 }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300
                      ${isActive
                        ? "bg-pink-600 text-white glow-animation"
                        : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                  >
                    {step}
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="w-full h-[400px] rounded-xl overflow-hidden shadow-xl border-2 border-pink-500 glow-animation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <MapContainer
                center={[location.lat, location.lng]}
                zoom={16}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[location.lat, location.lng]} icon={deliveryIcon}>
                  <Popup>
                    {order?.courierName || "Delivery Partner"} is here 🚚
                  </Popup>
                </Marker>
              </MapContainer>
            </motion.div>

            <motion.p
              className="mt-6 text-center text-sm text-gray-700 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Location auto-refreshes in real time.
            </motion.p>
            <motion.div
              className="flex justify-center mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded shadow hover:from-pink-600 hover:to-purple-600 font-bold transition-all duration-200"
                onClick={() => navigate("/orders")}
              >
                View All My Orders
              </button>
            </motion.div>
          </>
        ) : (
          <motion.div
            className="flex flex-col items-center mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <motion.img
              src="/empty-box.png"
              alt="No Order"
              className="w-32 h-32 mb-4"
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.7 }}
            />
            <motion.p
              className="text-lg text-red-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              No order found for this ID.
            </motion.p>
            <motion.button
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-bold transition-all duration-200"
              onClick={() => navigate("/orders")}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Go to My Orders
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
