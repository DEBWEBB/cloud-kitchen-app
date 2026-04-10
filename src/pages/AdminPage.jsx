import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import fallbackImage from "../assets/HungryBOX-logo.jpg";
import toast from "react-hot-toast";
import normalizeSupabaseAssetUrl from "../utils/normalizeSupabaseAssetUrl";


// Helper to check if date is within a range
const inRange = (d, from, to) =>
  new Date(d) >= new Date(from) && new Date(d) <= new Date(to);

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [tab, setTab] = useState("all");
  const [range, setRange] = useState({
    from: new Date().toISOString().slice(0,10),
    to: new Date().toISOString().slice(0,10),
  });

  // Fetch users once
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Admin users fetch failed:", error);
        toast.error("Could not load users.");
        setUsers([]);
      }
    })();
  }, []);

  // Real-time orders
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      snapshot => {
        const data = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(d.data().createdAt)
        }));
        setOrders(data);
        notifyChanges(data);
      },
      error => {
        console.error("Admin orders listener failed:", error);
        toast.error("Could not load orders.");
        setOrders([]);
      }
    );
    return () => unsub();
  }, []);

  // Notification helper
  const prevOrders = React.useRef([]);
  const notifyChanges = newList => {
    const prev = prevOrders.current;
    newList.forEach(o => {
      const old = prev.find(x => x.id === o.id);
      if (old && old.status !== o.status && Notification.permission === 'granted') {
        new Notification("Order Status Changed", {
          body: `Order #${o.id.slice(0,6)} is now '${o.status}'`
        });
      }
    });
    prevOrders.current = newList;
  };

  // Request permission
  useEffect(() => {
    if (Notification.permission !== "granted")
      Notification.requestPermission();
  }, []);

  // Filtering logic
  useEffect(() => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const filteredByDate = orders.filter(o => inRange(o.createdAt, from, to));
    const now = new Date();
    const filteredByTab = filteredByDate.filter(o => {
      if (tab === "today") {
        const d = new Date(o.createdAt);
        return d.toDateString() === now.toDateString();
      }
      if (tab === "week") {
        const d = new Date(o.createdAt);
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
        return d >= weekAgo;
      }
      return true;
    });
    setFiltered(filteredByTab);
  }, [orders, tab, range]);

  // Export CSV
  const exportCSV = () => {
    const csv = Papa.unparse(
      filtered.map(({ id, createdAt, ...rest }) => ({
        id,
        createdAt: new Date(createdAt).toLocaleString(),
        ...rest
      }))
    );
    saveAs(new Blob([csv], { type: 'text/csv' }), 'filtered-orders.csv');
  };

  // Revenue and AOV
  const totalRev = filtered.reduce((a,c) => a + (c.total || 0), 0);
  const aov = filtered.length ? (totalRev/filtered.length).toFixed(2) : 0;

  // Chart data
  const statusMap = {};
  filtered.forEach(o => statusMap[o.status] = (statusMap[o.status] || 0) + 1);
  const chartData = {
    labels: Object.keys(statusMap),
    datasets: [{
      data: Object.values(statusMap),
      backgroundColor: ["#10B981",'#F59E0B','#3B82F6','#EF4444']
    }],
  };

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-4xl font-bold mb-6 text-center">👨‍💻 Admin Dashboard</h1>

      {/* Filters Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 items-center">
        <div className="space-y-2">
          <label>Date range:</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              className="px-3 py-1 border rounded" 
              value={range.from} 
              onChange={e=>setRange({...range,from:e.target.value})}
            />
            <input 
              type="date" 
              className="px-3 py-1 border rounded" 
              value={range.to}
              onChange={e=>setRange({...range,to:e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-3">
          {["all","today","week"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded ${
                tab===t ? "bg-pink-600 text-white" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              {t==="all"?"All Time":t==="today"?"Today":"This Week"}
            </button>
          ))}
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600"
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Revenue & Chart */}
      <div className="md:flex justify-between items-center mb-6 gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">💰 Total Revenue</h2>
          <p className="text-xl">₹{totalRev.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold">📊 AOV</h2>
          <p className="text-xl">₹{aov}</p>
        </div>
        <div className="max-w-xs w-full">
          <Pie data={chartData} />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto mb-8">
        <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded">
          <thead className="bg-pink-600 text-white">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Status</th>
              <th className="p-2">Total</th>
              <th className="p-2">Shop</th>
              <th className="p-2">User Email</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o,i)=>(
              <tr key={o.id} className="odd:bg-gray-50 even:bg-gray-100 dark:odd:bg-gray-900 dark:even:bg-gray-800">
                <td className="p-2">{i+1}</td>
                <td className="p-2 capitalize">{o.status}</td>
                <td className="p-2">₹{o.total}</td>
                <td className="p-2">{o.shopName||"—"}</td>
                <td className="p-2">{o.email||"—"}</td>
                <td className="p-2">{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No orders in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Users Grid */}
      <h2 className="text-2xl font-semibold mb-4">👥 Users Overview</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u=>(
          <div key={u.id} className="bg-white dark:bg-gray-800 rounded shadow p-4 flex items-center gap-4">
            <img
              src={normalizeSupabaseAssetUrl(u.photoURL) || fallbackImage}
              className="w-16 h-16 rounded-full object-cover"
              alt={u.name||"User"}
            />
            <div>
              <p className="font-semibold">{u.name||"No Name"}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{u.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
