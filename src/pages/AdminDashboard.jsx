// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { CSVLink } from "react-csv";
import { motion } from "framer-motion";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(arr);
      },
      (error) => {
        console.error("Admin dashboard listener failed:", error);
        setOrders([]);
      }
    );

    return () => unsub();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!filter.trim()) return orders;
    return orders.filter((o) =>
      o.id.toLowerCase().includes(filter.toLowerCase()) ||
      (o.status || "").toLowerCase().includes(filter.toLowerCase()) ||
      (o.userId || "").toLowerCase().includes(filter.toLowerCase())
    );
  }, [orders, filter]);

  const statusCounts = useMemo(() => {
    const count = {};
    orders.forEach((o) => {
      count[o.status] = (count[o.status] || 0) + 1;
    });
    return count;
  }, [orders]);

  const revenueByDay = useMemo(() => {
    const sum = {};
    orders.forEach((o) => {
      const date = new Date(o.createdAt.seconds * 1000).toLocaleDateString();
      sum[date] = (sum[date] || 0) + (o.total || 0);
    });
    return sum;
  }, [orders]);

  const barData = {
    labels: Object.keys(revenueByDay),
    datasets: [
      {
        label: "Revenue",
        data: Object.values(revenueByDay),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const pieData = {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        label: "Order Status",
        data: Object.values(statusCounts),
        backgroundColor: [
          "#4ade80", // green
          "#facc15", // yellow
          "#f87171", // red
          "#60a5fa", // blue
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-gray-800 dark:text-gray-100">
      <motion.h1
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        👨‍💼 Admin Dashboard
      </motion.h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="Search orders by ID, status, or user..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 p-3 rounded-lg border focus:ring-2 ring-indigo-400 bg-white dark:bg-gray-800 outline-none"
        />

        <CSVLink
          data={orders.map((o) => ({
            id: o.id,
            status: o.status,
            userId: o.userId,
            total: o.total,
            createdAt: o.createdAt?.seconds
              ? new Date(o.createdAt.seconds * 1000).toLocaleString()
              : "",
          }))}
          filename="orders_export.csv"
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition"
        >
          📦 Export CSV
        </CSVLink>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold mb-2">Status Distribution</h2>
          <Pie data={pieData} />
        </motion.div>

        <motion.div
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-semibold mb-2">Revenue Over Time</h2>
          <Bar data={barData} />
        </motion.div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <thead>
            <tr className="text-left bg-indigo-500 text-white">
              <th className="p-3">Order ID</th>
              <th>User ID</th>
              <th>Status</th>
              <th>Total (₹)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <td className="p-3 font-mono text-sm">{o.id}</td>
                <td className="p-3 truncate max-w-xs">{o.userId}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full ${
                    o.status === "delivered"
                      ? "bg-green-200 text-green-800"
                      : o.status === "pending"
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-blue-200 text-blue-800"
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3">₹{o.total}</td>
                <td className="p-3">
                  {o.createdAt?.seconds
                    ? new Date(o.createdAt.seconds * 1000).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
