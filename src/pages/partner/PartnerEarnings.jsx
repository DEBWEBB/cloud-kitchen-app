// src/pages/partner/PartnerEarnings.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Bar, Pie } from "react-chartjs-2";
import CountUp from "react-countup";
import PartnerHeader from "../../components/PartnerHeader";

export default function PartnerEarnings() {
  const [user] = useAuthState(auth);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("courierId", "==", user.uid),
      where("status", "==", "delivered")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => doc.data());
      setOrders(data);
    });

    return () => unsubscribe();
  }, [user]);

  const totalEarnings = orders.reduce((sum, o) => sum + (o.partnerShare || 0), 0);
  const deliveryCount = orders.length;

  const byDay = orders.reduce((map, order) => {
    const date = new Date(order.createdAt?.seconds * 1000).toLocaleDateString();
    map[date] = (map[date] || 0) + (order.partnerShare || 0);
    return map;
  }, {});

  const statusCount = orders.reduce((m, o) => {
    m[o.status] = (m[o.status] || 0) + 1;
    return m;
  }, {});

  const barData = {
    labels: Object.keys(byDay),
    datasets: [
      {
        label: "₹ Earned Per Day",
        data: Object.values(byDay),
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderRadius: 6,
      },
    ],
  };

  const pieData = {
    labels: Object.keys(statusCount),
    datasets: [
      {
        label: "Orders by Status",
        data: Object.values(statusCount),
        backgroundColor: ["#60a5fa", "#facc15", "#10b981"],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white pt-20">
      <PartnerHeader />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold mb-4 animate-fade-in">📊 Delivery Partner Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Total Earnings</h3>
            <p className="text-3xl text-green-500 font-bold mt-2">
              ₹<CountUp end={totalEarnings} duration={2} separator="," />
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Orders Delivered</h3>
            <p className="text-3xl text-blue-500 font-bold mt-2">
              <CountUp end={deliveryCount} duration={2} />
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold">Avg Earning / Order</h3>
            <p className="text-3xl text-purple-500 font-bold mt-2">
              ₹
              <CountUp
                end={deliveryCount ? totalEarnings / deliveryCount : 0}
                duration={2}
                decimals={2}
              />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">📅 Daily Earnings</h3>
            <Bar data={barData} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">📦 Order Status</h3>
            <Pie data={pieData} />
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Stats auto-update in real-time. Stay awesome! 🚀
        </p>
      </div>
    </div>
  );
}
