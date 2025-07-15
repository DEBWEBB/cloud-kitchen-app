import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const statusOptions = ["pending", "picked", "on the way", "delivered"];

export default function DeliveryStatusPage() {
  const { orderId } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [userCodeInput, setUserCodeInput] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchOrder = async () => {
      try {
        const docRef = doc(db, "orders", orderId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();

          console.log("Logged in user UID:", user?.uid);
          console.log("Order courierId:", data?.courierId);

          if (data.courierId !== user.uid) {
            toast.error("⛔ Permission denied");
            return;
          }

          setOrder(data);
          setStatus(data.status || "");
        } else {
          toast.error("❌ Order not found");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        toast.error("⚠️ Error fetching order");
      }
    };

    fetchOrder();
  }, [orderId, user]);

  useEffect(() => {
    if (order?.location && !mapLoaded) {
      const map = L.map("map").setView(
        [order.location.lat, order.location.lng],
        15
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([order.location.lat, order.location.lng])
        .addTo(map)
        .bindPopup("📍 Delivery Location")
        .openPopup();

      setMapLoaded(true);
    }
  }, [order, mapLoaded]);

  const handleStatusUpdate = async () => {
    try {
      const updateRef = doc(db, "orders", orderId);
      await updateDoc(updateRef, {
        status,
        lastUpdatedAt: Timestamp.now(),
      });
      toast.success("✅ Status updated to " + status);
    } catch (err) {
      console.error("Update error:", err);
      toast.error("❌ Update failed: Permission issue.");
    }
  };

  const handleConfirmDelivery = async () => {
    if (userCodeInput.trim() === order?.secretCode) {
      try {
        await updateDoc(doc(db, "orders", orderId), {
          status: "delivered",
          deliveredAt: Timestamp.now(),
        });
        toast.success("🎉 Delivery confirmed!");
      } catch (err) {
        console.error("Delivery confirm error:", err);
        toast.error("❌ Delivery confirmation failed.");
      }
    } else {
      toast.error("❌ Incorrect secret code.");
    }
  };

  if (!user || !order)
    return (
      <div className="p-10 text-center text-lg dark:text-white">
        Loading order details...
      </div>
    );

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-3xl font-bold text-center mb-4">
        📦 Manage Delivery
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
        Order ID: <span className="font-mono">{orderId}</span>
      </p>

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* 🛠 Status Update */}
        <div>
          <label className="block mb-2 font-medium">Update Delivery Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-3 rounded border dark:bg-gray-800"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option.toUpperCase()}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusUpdate}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            🔁 Update Status
          </button>
        </div>

        {/* 🗺️ Delivery Location Map */}
        <div>
          <label className="block mb-2 font-medium">📍 Delivery Location:</label>
          <div id="map" className="h-[300px] rounded shadow border" />
        </div>

        {/* 📸 Selfie Display */}
        {order?.selfieUrl && (
          <div>
            <label className="block mb-2 font-medium">🧍 Delivery Partner Selfie:</label>
            <img
              src={order.selfieUrl}
              alt="Selfie"
              className="rounded w-40 h-40 object-cover border shadow"
            />
          </div>
        )}

        {/* 🔐 Secret Code Confirmation */}
        <div>
          <label className="block mb-2 font-medium">🔐 Confirm with Secret Code:</label>
          <input
            type="text"
            placeholder="Enter code given by customer"
            value={userCodeInput}
            onChange={(e) => setUserCodeInput(e.target.value)}
            className="w-full p-3 rounded border dark:bg-gray-800 mb-3"
          />
          <button
            onClick={handleConfirmDelivery}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            ✅ Confirm Delivery
          </button>
        </div>
      </div>
    </div>
  );
}
