// src/pages/OrderHistory.jsx
import { useEffect, useState } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "orders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setOrders(fetched);
    };

    fetchOrders();
  }, []);

  const downloadOrderAsPDF = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Order Invoice", 10, 10);
    doc.text(`Order ID: ${order.id}`, 10, 20);
    doc.text(`Payment Method: ${order.paymentMethod}`, 10, 30);
    doc.text(`Status: ${order.status}`, 10, 40);
    doc.text(`Distance: ${order.distanceKm} km`, 10, 50);
    doc.text(`Delivery Charge: Rs ${order.deliveryCharge}`, 10, 60);
    doc.text(`Product Total: Rs ${order.productTotal}`, 10, 70);
    doc.text(`Total Paid: Rs ${order.total}`, 10, 80);

    doc.text("Items:", 10, 90);
    order.items.forEach((item, index) => {
      const y = 100 + index * 10;
      doc.text(
        `${index + 1}. ${item.name} - Rs ${item.price} x ${item.quantity}`,
        10,
        y
      );
    });

    doc.save(`order-${order.id}.pdf`);
  };

  if (!orders.length) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4 text-gray-500 dark:text-gray-300">
        <p className="text-lg">🕗 You haven’t placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-12 bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">📜 Order History</h1>

      <div className="space-y-6 max-w-3xl mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="border rounded-lg shadow-sm p-6 bg-white dark:bg-gray-800 transition-all hover:shadow-md"
          >
            <div className="mb-2">
              <span className="text-sm text-gray-500">🆔 Order ID:</span>
              <p className="text-md font-mono break-all">{order.id}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
              <p>💳 <strong>Payment:</strong> {order.paymentMethod}</p>
              <p>📦 <strong>Status:</strong> {order.status}</p>
              <p>📍 <strong>Distance:</strong> {order.distanceKm} km</p>
              <p>🚚 <strong>Delivery:</strong> Rs {order.deliveryCharge}</p>
              <p>🧾 <strong>Items Total:</strong> Rs {order.productTotal}</p>
              <p className="text-green-600 dark:text-green-400 font-bold">
                💰 <strong>Total Paid:</strong> Rs {order.total}
              </p>
            </div>

            <div className="mt-4">
              <p className="font-semibold mb-1">🛍️ Items Ordered:</p>
              <ul className="pl-4 list-disc text-sm text-gray-700 dark:text-gray-300">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} - Rs {item.price} × {item.quantity}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => downloadOrderAsPDF(order)}
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
            >
              ⬇️ Download PDF Invoice
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
