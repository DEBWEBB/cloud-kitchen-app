import { motion } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import useLocationUpdater from "../utils/useLocationUpdater";

export default function LiveOrderCard({ order }) {
  useLocationUpdater(order.id, order.status !== "delivered");

  const markAsDelivered = async () => {
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
      });
      alert(`✅ Order ${order.id} marked as delivered`);
    } catch (error) {
      console.error("Error updating order:", error);
      alert("❌ Failed to mark as delivered");
    }
  };

  return (
    <li className="p-4 bg-white dark:bg-gray-800 rounded shadow space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-lg font-semibold">
            🍽️ Order #{order.id.slice(0, 6).toUpperCase()}
          </p>
          <p className="text-sm text-gray-500">Shop: {order.shopName || "Unknown"}</p>
          <p className="text-sm text-gray-500">Status: {order.status}</p>
        </div>

        <motion.div
          className="w-32 h-2 rounded bg-gray-300 overflow-hidden"
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2 }}
        >
          <div className="bg-green-500 h-full animate-pulse" />
        </motion.div>
      </div>

      <div className="mt-2">
        <img
          src={`https://maps.googleapis.com/maps/api/staticmap?center=22.5726,88.3639&zoom=14&size=400x150&markers=color:red%7Clabel:C%7C22.5726,88.3639&key=YOUR_GOOGLE_MAPS_API_KEY`}
          alt="Map preview"
          className="rounded w-full max-w-md"
        />
      </div>

      <div className="pt-3">
        <button
          onClick={markAsDelivered}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          ✅ Mark as Delivered
        </button>
      </div>
    </li>
  );
}
