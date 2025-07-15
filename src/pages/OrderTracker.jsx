// src/pages/OrderTracker.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom delivery icon
const deliveryIcon = new L.Icon({
  iconUrl: "/delivery-icon.png", // Make sure it's in your public/ folder
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
  const [order, setOrder] = useState(null);
  const [location, setLocation] = useState({ lat: 22.5726, lng: 88.3639 }); // default
  const [statusNotified, setStatusNotified] = useState("");

  useEffect(() => {
    if (!orderId) return;

    const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder(data);
        if (data?.courierLocation) {
          setLocation(data.courierLocation);
        } else if (data?.location) {
          setLocation(data.location);
        }

        // Push notification
        if (statusNotified && statusNotified !== data.status) {
          if (Notification.permission === "granted") {
            new Notification("📦 Order Update", {
              body: `Status changed to: ${data.status}`,
              icon: "/delivery-icon.png",
            });
          }
        }
        setStatusNotified(data.status);
      }
    });

    return () => unsub();
  }, [orderId]);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen p-6 pt-20 bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 dark:from-gray-900 dark:via-gray-800 dark:to-black text-black dark:text-white">
      <h1 className="text-3xl font-bold mb-4">📍 Live Order Tracking</h1>
      <p>Tracking Order ID: <strong>{orderId}</strong></p>

      {order ? (
        <>
          <div className="mt-4 mb-6 space-y-2">
            <p>📦 <strong>Status:</strong> {order.status}</p>
            <p>💰 <strong>Total:</strong> ₹{order.total}</p>
            <p>🚚 <strong>Delivery Partner:</strong> {order.courierName || "—"}</p>
            <p>📞 <strong>Phone:</strong> {order.courierPhone || "—"}</p>
          </div>

          {/* 🔄 Progress Tracker */}
          <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
            {statusSteps.map((step) => {
              const isActive = order?.status?.toLowerCase().includes(step.toLowerCase());
              return (
                <div
                  key={step}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300
                    ${isActive
                      ? "bg-pink-600 text-white glow-animation"
                      : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}
                >
                  {step}
                </div>
              );
            })}
          </div>

          {/* 🗺️ Live Map */}
          <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-xl border-2 border-pink-500 glow-animation">
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
          </div>

          <p className="mt-6 text-center text-sm text-gray-700 dark:text-gray-400">
            Location auto-refreshes in real time.
          </p>
        </>
      ) : (
        <p className="mt-10 text-center text-lg text-gray-500 dark:text-gray-300">
          🔄 Loading order data...
        </p>
      )}
    </div>
  );
}
