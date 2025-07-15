// src/components/OrderNotificationCard.jsx
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import toast from "react-hot-toast";

export default function OrderNotificationCard({ order }) {
  const handleAccept = async () => {
    await updateDoc(doc(db, "orders", order.id), { status: "Accepted" });
    toast.success("✅ Order Accepted");
  };

  const handleDecline = async () => {
    await updateDoc(doc(db, "orders", order.id), { status: "Declined" });
    toast.error("❌ Order Declined");
  };

  return (
    <div className="p-4 border rounded shadow bg-white dark:bg-gray-800">
      <h3 className="font-bold">🆕 New Order</h3>
      <p>Items: {order.items.length}</p>
      <p>Delivery Charge: ₹{order.deliveryCharge}</p>
      <p>Customer: {order.userEmail}</p>
      <div className="mt-2 flex gap-2">
        <button onClick={handleAccept} className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700">Accept</button>
        <button onClick={handleDecline} className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700">Decline</button>
      </div>
    </div>
  );
}
