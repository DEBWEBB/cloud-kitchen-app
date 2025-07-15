// src/pages/CourierDashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { motion } from "framer-motion";
import useLocationUpdater from "../utils/useLocationUpdater";
import { toast } from "react-hot-toast";

const statusSteps = ["cooking", "dispatched", "on the way", "delivered"];

const getStatusStep = (status) => statusSteps.indexOf(status.toLowerCase());
const getNextStatus = (current) => {
  const idx = getStatusStep(current);
  return idx < statusSteps.length - 1 ? statusSteps[idx + 1] : null;
};

export default function CourierDashboard() {
  const [user] = useAuthState(auth);
  const [orders, setOrders] = useState([]);
  const [codeInputs, setCodeInputs] = useState({});

  useLocationUpdater(); // 📍 Real-time location sync

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("courierId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filteredOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(filteredOrders);
    });

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (order) => {
    const nextStatus = getNextStatus(order.status);
    if (!nextStatus) return;

    try {
      const orderRef = doc(db, "orders", order.id);
      console.log("🚚 Updating order status:", {
        orderId: order.id,
        nextStatus,
        courierId: user?.uid,
      });

      await updateDoc(orderRef, {
        status: nextStatus,
        lastUpdatedAt: Timestamp.now(),
      });
      toast.success(`✅ Order marked as "${nextStatus}"`);
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("❌ Failed to update status");
    }
  };

  const confirmDelivery = async (order) => {
    const enteredCode = codeInputs[order.id];
    if (enteredCode !== order.secretCode) {
      toast.error("❌ Incorrect delivery code");
      return;
    }

    try {
      const orderRef = doc(db, "orders", order.id);
      console.log("📦 Confirming delivery for:", order.id);

      await updateDoc(orderRef, {
        status: "delivered",
        deliveredAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
      });

      toast.success("✅ Order marked as delivered");
    } catch (error) {
      console.error("Delivery confirmation error:", error);
      toast.error("❌ Failed to confirm delivery");
    }
  };

  const shopLocation = { lat: 22.5726, lng: 88.3639 };

  if (!user) {
    return (
      <div className="p-10 text-center text-red-600 text-xl">
        ❌ Access denied. Please log in as a delivery partner.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 text-black dark:text-white">
      <h1 className="text-4xl font-bold mb-6 text-center">🚚 Courier Dashboard</h1>
      <p className="text-center text-lg mb-6">
        Welcome, <strong>{user.email || user.uid}</strong>!
      </p>

      <div className="grid gap-6">
        {orders.length === 0 ? (
          <p className="text-center text-lg">🎉 No active orders right now.</p>
        ) : (
          orders.map((order) => {
            const currentStep = getStatusStep(order.status);
            const nextStatus = getNextStatus(order.status);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-pink-300 overflow-hidden"
              >
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-1">
                    🍽️ Order #{order.id.slice(0, 6).toUpperCase()}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Customer: {order.userEmail || "N/A"}
                  </p>
                  <p className="text-sm">
                    Status:{" "}
                    <span className="font-semibold text-pink-600 dark:text-yellow-300">
                      {order.status}
                    </span>
                  </p>
                  {order.secretCode && (
                    <p className="text-sm mt-1 text-green-600">
                      🔐 Secret Code: <strong>Ask the customer</strong> at delivery.
                    </p>
                  )}
                </div>

                {/* 🧭 Static Map View (Optional) */}
                <div className="w-full">
                  <img
                    src={`https://via.placeholder.com/600x200.png?text=Map+Disabled`}
                    alt="Map route"
                    className="w-full h-40 object-cover"
                  />
                </div>

                {/* Progress bar */}
                <div className="flex items-center justify-between px-6 py-3">
                  {statusSteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex-1 flex flex-col items-center text-xs text-center"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 
                          ${
                            index <= currentStep
                              ? "bg-green-500 text-white"
                              : "bg-gray-300 dark:bg-gray-700 text-gray-800"
                          }`}
                      >
                        {index === 0 ? "🍳" : index === 1 ? "📦" : index === 2 ? "🚛" : "✅"}
                      </div>
                      <span className="capitalize">{step}</span>
                    </div>
                  ))}
                </div>

                {/* 🔘 Manage Actions */}
                <div className="p-4 text-center space-y-2">
                  {nextStatus && order.status !== "delivered" && (
                    <button
                      onClick={() => updateStatus(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow transition"
                    >
                      🔄 Update to "{nextStatus}"
                    </button>
                  )}

                  {order.status === "on the way" && (
                    <>
                      <input
                        type="text"
                        placeholder="Enter secret code"
                        className="mt-2 px-4 py-2 rounded border dark:bg-gray-700"
                        value={codeInputs[order.id] || ""}
                        onChange={(e) =>
                          setCodeInputs((prev) => ({
                            ...prev,
                            [order.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        onClick={() => confirmDelivery(order)}
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow transition"
                      >
                        ✅ Confirm Delivery
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => auth.signOut()}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded shadow-lg"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
