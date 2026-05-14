import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { motion } from "framer-motion";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowDownToLine,
  BadgeIndianRupee,
  CheckCircle2,
  Clock3,
  Filter,
  Package,
  Store,
  Truck,
  Users,
} from "lucide-react";
import { db } from "../firebase/firebaseConfig";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const DATE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "custom", label: "Custom" },
];

const DEFAULT_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#94a3b8",
        font: { size: 12, weight: "600" },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(148,163,184,0.08)" },
    },
    y: {
      ticks: { color: "#94a3b8" },
      grid: { color: "rgba(148,163,184,0.08)" },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom",
      labels: {
        color: "#94a3b8",
        padding: 16,
        font: { size: 12, weight: "600" },
      },
    },
  },
  cutout: "62%",
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDay = (date) =>
  date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

const formatHourBucket = (hour) => {
  const startHour = `${String(hour).padStart(2, "0")}:00`;
  const endHour = `${String((hour + 1) % 24).padStart(2, "0")}:00`;
  return `${startHour}–${endHour}`;
};

const getInitials = (value = "") =>
  String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "HB";

const matchesPreset = (date, preset, fromDate, toDateValue) => {
  if (!date) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "all") return true;
  if (preset === "today") return date >= todayStart;

  if (preset === "7d") {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 6);
    return date >= start;
  }

  if (preset === "30d") {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 29);
    return date >= start;
  }

  if (preset === "custom") {
    if (!fromDate || !toDateValue) return true;
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDateValue);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
  }

  return true;
};

function InsightCard({ title, value, detail, accent = "from-pink-500 to-orange-400", icon: Icon }) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <motion.section
      className={`rounded-[32px] border border-white/60 bg-white/80 p-5 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.5)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 md:p-6 ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </motion.section>
  );
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Admin dashboard orders listener failed:", error);
        toast.error("Could not load dashboard orders.");
        setOrders([]);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Admin dashboard users listener failed:", error);
        toast.error("Could not load users.");
        setUsers([]);
      }
    );

    const unsubscribePartners = onSnapshot(
      collection(db, "partners"),
      (snapshot) => {
        setPartners(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
      (error) => {
        console.error("Admin dashboard partners listener failed:", error);
        toast.error("Could not load partners.");
        setPartners([]);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeUsers();
      unsubscribePartners();
    };
  }, []);

  const filterOptions = useMemo(() => {
    const statuses = [...new Set(orders.map((order) => String(order.status || "pending").toLowerCase()))]
      .filter(Boolean)
      .sort();
    const stores = [...new Set(orders.map((order) => order.storeName || order.shopName || order.store || ""))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    const payments = [...new Set(orders.map((order) => order.paymentMethod || order.paymentProvider || "Unknown"))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return { statuses, stores, payments };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const createdAt = toDate(order.createdAt || order.confirmedAt || order.lastUpdatedAt);
      if (!matchesPreset(createdAt, datePreset, dateFrom, dateTo)) return false;

      const normalizedStatus = String(order.status || "pending").toLowerCase();
      const normalizedStore = String(order.storeName || order.shopName || order.store || "");
      const normalizedPayment = String(order.paymentMethod || order.paymentProvider || "Unknown");

      if (statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
      if (storeFilter !== "all" && normalizedStore !== storeFilter) return false;
      if (paymentFilter !== "all" && normalizedPayment !== paymentFilter) return false;

      if (!normalizedSearch) return true;

      const haystack = [
        order.id,
        order.userId,
        order.name,
        order.phone,
        normalizedStatus,
        normalizedStore,
        order.courierName,
        order.courierPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [orders, search, datePreset, dateFrom, dateTo, statusFilter, storeFilter, paymentFilter]);

  const analytics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const deliveredOrders = filteredOrders.filter(
      (order) => String(order.status || "").toLowerCase() === "delivered"
    );
    const activeOrders = filteredOrders.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      return status && status !== "delivered" && status !== "cancelled";
    });
    const pendingAssignments = filteredOrders.filter((order) => order.assignmentPending).length;
    const avgOrderValue = filteredOrders.length ? totalRevenue / filteredOrders.length : 0;
    const deliveryFees = filteredOrders.reduce(
      (sum, order) => sum + Number(order.deliveryCharge || 0),
      0
    );
    const onlinePayments = filteredOrders.filter(
      (order) => String(order.paymentMethod || "").toUpperCase() === "ONLINE"
    ).length;
    const uniqueCustomers = new Set(filteredOrders.map((order) => order.userId).filter(Boolean)).size;

    const statusMap = {};
    const storeMap = {};
    const paymentMap = {};
    const dayRevenueMap = {};
    const hourMap = {};
    const customerSpendMap = {};

    filteredOrders.forEach((order) => {
      const status = String(order.status || "pending").toLowerCase();
      const store = order.storeName || order.shopName || order.store || "Unknown";
      const payment = order.paymentMethod || order.paymentProvider || "Unknown";
      const createdAt = toDate(order.createdAt || order.confirmedAt || order.lastUpdatedAt);
      const amount = Number(order.total || 0);

      statusMap[status] = (statusMap[status] || 0) + 1;
      storeMap[store] = (storeMap[store] || 0) + amount;
      paymentMap[payment] = (paymentMap[payment] || 0) + 1;

      if (createdAt) {
        const dayKey = formatDay(createdAt);
        const hourKey = formatHourBucket(createdAt.getHours());
        dayRevenueMap[dayKey] = (dayRevenueMap[dayKey] || 0) + amount;
        hourMap[hourKey] = (hourMap[hourKey] || 0) + 1;
      }

      const customerKey = order.name || order.phone || order.userId;
      if (customerKey) {
        customerSpendMap[customerKey] = {
          total: (customerSpendMap[customerKey]?.total || 0) + amount,
          orders: (customerSpendMap[customerKey]?.orders || 0) + 1,
        };
      }
    });

    const topStores = Object.entries(storeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const topCustomers = Object.entries(customerSpendMap)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const peakHours = Object.entries(hourMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      totalRevenue,
      deliveredOrders: deliveredOrders.length,
      activeOrders: activeOrders.length,
      avgOrderValue,
      avgDeliveryCharge: filteredOrders.length ? deliveryFees / filteredOrders.length : 0,
      pendingAssignments,
      onlinePaymentShare: filteredOrders.length
        ? Math.round((onlinePayments / filteredOrders.length) * 100)
        : 0,
      uniqueCustomers,
      statusMap,
      storeMap,
      paymentMap,
      dayRevenueMap,
      hourMap,
      topStores,
      topCustomers,
      peakHours,
      completionRate: filteredOrders.length
        ? Math.round((deliveredOrders.length / filteredOrders.length) * 100)
        : 0,
    };
  }, [filteredOrders]);

  const partnerStats = useMemo(() => {
    const verifiedPartners = partners.filter((partner) => partner.isVerified).length;
    const onlinePartners = partners.filter((partner) => partner.isOnline).length;
    const activePartners = partners.filter((partner) => partner.currentOrderId).length;

    return {
      total: partners.length,
      verified: verifiedPartners,
      online: onlinePartners,
      active: activePartners,
    };
  }, [partners]);

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => {
          const left = toDate(b.createdAt || b.updatedAt)?.getTime() || 0;
          const right = toDate(a.createdAt || a.updatedAt)?.getTime() || 0;
          return left - right;
        })
        .slice(0, 6),
    [users]
  );

  const partnerRoster = useMemo(
    () =>
      [...partners]
        .sort((a, b) => {
          const score = (value) =>
            (value.isOnline ? 100 : 0) + (value.isVerified ? 10 : 0) + (value.currentOrderId ? 5 : 0);
          return score(b) - score(a);
        })
        .slice(0, 6),
    [partners]
  );

  const revenueChart = useMemo(
    () => ({
      labels: Object.keys(analytics.dayRevenueMap),
      datasets: [
        {
          label: "Revenue",
          data: Object.values(analytics.dayRevenueMap),
          borderRadius: 14,
          backgroundColor: [
            "rgba(244,114,182,0.85)",
            "rgba(251,146,60,0.85)",
            "rgba(59,130,246,0.85)",
            "rgba(16,185,129,0.85)",
          ],
        },
      ],
    }),
    [analytics.dayRevenueMap]
  );

  const statusChart = useMemo(
    () => ({
      labels: Object.keys(analytics.statusMap),
      datasets: [
        {
          data: Object.values(analytics.statusMap),
          backgroundColor: [
            "#22c55e",
            "#f59e0b",
            "#ec4899",
            "#3b82f6",
            "#ef4444",
            "#8b5cf6",
          ],
          borderWidth: 0,
        },
      ],
    }),
    [analytics.statusMap]
  );

  const storeChart = useMemo(
    () => ({
      labels: analytics.topStores.map(([name]) => name),
      datasets: [
        {
          label: "Store revenue",
          data: analytics.topStores.map(([, value]) => value),
          borderRadius: 14,
          backgroundColor: "rgba(59,130,246,0.8)",
        },
      ],
    }),
    [analytics.topStores]
  );

  const paymentChart = useMemo(
    () => ({
      labels: Object.keys(analytics.paymentMap),
      datasets: [
        {
          data: Object.values(analytics.paymentMap),
          backgroundColor: ["#f97316", "#0ea5e9", "#8b5cf6", "#94a3b8"],
          borderWidth: 0,
        },
      ],
    }),
    [analytics.paymentMap]
  );

  const exportOrdersCsv = () => {
    const payload = filteredOrders.map((order) => ({
      orderId: order.id,
      status: order.status || "pending",
      store: order.storeName || order.shopName || order.store || "",
      customerName: order.name || "",
      customerPhone: order.phone || "",
      courierName: order.courierName || "",
      paymentMethod: order.paymentMethod || order.paymentProvider || "",
      paymentStatus: order.paymentStatus || "",
      total: Number(order.total || 0),
      deliveryCharge: Number(order.deliveryCharge || 0),
      assignmentPending: Boolean(order.assignmentPending),
      createdAt: formatDateTime(order.createdAt || order.confirmedAt || order.lastUpdatedAt),
    }));

    const csv = Papa.unparse(payload);
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `admin-orders-${Date.now()}.csv`
    );
  };

  const exportAnalyticsCsv = () => {
    const rows = [
      { metric: "Filtered orders", value: filteredOrders.length },
      { metric: "Delivered orders", value: analytics.deliveredOrders },
      { metric: "Active orders", value: analytics.activeOrders },
      { metric: "Pending assignments", value: analytics.pendingAssignments },
      { metric: "Completion rate", value: `${analytics.completionRate}%` },
      { metric: "Total revenue", value: analytics.totalRevenue },
      { metric: "Average order value", value: analytics.avgOrderValue.toFixed(2) },
      { metric: "Average delivery charge", value: analytics.avgDeliveryCharge.toFixed(2) },
      { metric: "Online payment share", value: `${analytics.onlinePaymentShare}%` },
      { metric: "Unique customers", value: analytics.uniqueCustomers },
      { metric: "Total users", value: users.length },
      { metric: "Partners online", value: partnerStats.online },
      { metric: "Partners verified", value: partnerStats.verified },
      { metric: "Partners active", value: partnerStats.active },
    ];

    const csv = Papa.unparse(rows);
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `admin-analytics-${Date.now()}.csv`
    );
  };

  const exportOrdersJson = () => {
    const payload = filteredOrders.map((order) => ({
      ...order,
      createdAt: formatDateTime(order.createdAt || order.confirmedAt || order.lastUpdatedAt),
    }));
    saveAs(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" }),
      `admin-orders-${Date.now()}.json`
    );
  };

  const resetFilters = () => {
    setSearch("");
    setDatePreset("7d");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setStoreFilter("all");
    setPaymentFilter("all");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_22%),linear-gradient(to_bottom,_#f8fafc,_#eef2ff_42%,_#f8fafc)] px-4 pb-12 pt-24 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_22%),linear-gradient(to_bottom,_#020617,_#0f172a_46%,_#020617)] dark:text-white md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          className="relative overflow-hidden rounded-[34px] border border-white/60 bg-slate-950 p-6 text-white shadow-[0_36px_90px_-52px_rgba(15,23,42,0.85)] md:p-8"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-pink-200">
                <Activity size={14} />
                Operations Intelligence
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Admin analytics, partner health, and order performance in one view.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                Track revenue, order flow, payment mix, partner readiness, and customer demand
                with export-ready filters built for daily operations.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-md">
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Orders in view</p>
                <p className="mt-3 text-3xl font-black">{filteredOrders.length}</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Revenue in view</p>
                <p className="mt-3 text-3xl font-black">{formatCurrency(analytics.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <SectionCard
          title="Filters and exports"
          subtitle="Narrow the dashboard to a specific operating window, payment mode, store, or status, then download the exact slice you are reviewing."
          actions={
            <>
              <button onClick={resetFilters} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                Reset filters
              </button>
              <button onClick={exportOrdersCsv} className="rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110">
                <ArrowDownToLine size={15} className="mr-2 inline-flex" />
                Orders CSV
              </button>
              <button onClick={exportAnalyticsCsv} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                Analytics CSV
              </button>
              <button onClick={exportOrdersJson} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                JSON snapshot
              </button>
            </>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Search
              </span>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order, customer, phone, rider..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Date window
              </span>
              <select
                value={datePreset}
                onChange={(event) => setDatePreset(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All statuses</option>
                {filterOptions.statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Store
              </span>
              <select
                value={storeFilter}
                onChange={(event) => setStoreFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All stores</option>
                {filterOptions.stores.map((storeName) => (
                  <option key={storeName} value={storeName}>
                    {storeName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Payment
              </span>
              <select
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="all">All payment modes</option>
                {filterOptions.payments.map((payment) => (
                  <option key={payment} value={payment}>
                    {payment}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {datePreset === "custom" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          ) : null}
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightCard
            title="Revenue"
            value={formatCurrency(analytics.totalRevenue)}
            detail={`${filteredOrders.length} filtered orders`}
            icon={BadgeIndianRupee}
            accent="from-emerald-500 to-teal-400"
          />
          <InsightCard
            title="Completion rate"
            value={`${analytics.completionRate}%`}
            detail={`${analytics.deliveredOrders} delivered • ${analytics.activeOrders} active`}
            icon={CheckCircle2}
            accent="from-pink-500 to-orange-400"
          />
          <InsightCard
            title="Average order"
            value={formatCurrency(analytics.avgOrderValue)}
            detail={`${formatCurrency(analytics.avgDeliveryCharge)} average delivery fee`}
            icon={Package}
            accent="from-violet-500 to-fuchsia-400"
          />
          <InsightCard
            title="Partner availability"
            value={`${partnerStats.online}/${partnerStats.total}`}
            detail={`${partnerStats.active} active • ${partnerStats.verified} verified`}
            icon={Truck}
            accent="from-sky-500 to-cyan-400"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <SectionCard
            title="Revenue trend"
            subtitle="Daily revenue inside the current filter window."
          >
            <div className="h-[320px]">
              <Bar data={revenueChart} options={DEFAULT_CHART_OPTIONS} />
            </div>
          </SectionCard>

          <SectionCard
            title="Status mix"
            subtitle="How the filtered orders are distributed by final or current state."
          >
            <div className="h-[320px]">
              <Doughnut data={statusChart} options={doughnutOptions} />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            title="Store contribution"
            subtitle="Top revenue-driving stores in the selected window."
          >
            <div className="h-[300px]">
              <Bar data={storeChart} options={DEFAULT_CHART_OPTIONS} />
            </div>
          </SectionCard>

          <SectionCard
            title="Payment mix"
            subtitle={`${analytics.onlinePaymentShare}% of orders in this view were paid online.`}
          >
            <div className="h-[300px]">
              <Doughnut data={paymentChart} options={doughnutOptions} />
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Operational highlights"
            subtitle="Quick reference points for store, customer, and partner performance."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Customer activity
                </p>
                <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                  {analytics.uniqueCustomers}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Unique customers in the current filtered view.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Pending assignments
                </p>
                <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                  {analytics.pendingAssignments}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Orders still waiting for partner assignment.
                </p>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Peak order hours
                </p>
                <div className="mt-3 space-y-2">
                  {analytics.peakHours.length ? (
                    analytics.peakHours.map(([label, count]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 dark:text-slate-200">{label}</span>
                        <span className="font-semibold text-slate-950 dark:text-white">{count} orders</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No hour data yet.</p>
                  )}
                </div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Top customers
                </p>
                <div className="mt-3 space-y-2">
                  {analytics.topCustomers.length ? (
                    analytics.topCustomers.map((customer) => (
                      <div key={customer.name} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-slate-700 dark:text-slate-200">{customer.name}</span>
                        <span className="shrink-0 font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(customer.total)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No customer spend data yet.</p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Network overview"
            subtitle="Operational totals across users and partner accounts."
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-[26px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-pink-500/10 p-3 text-pink-500">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Registered users</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Accounts in Firestore</p>
                  </div>
                </div>
                <span className="text-xl font-black text-slate-950 dark:text-white">{users.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-[26px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-500">
                    <Truck size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Online partners</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Currently available to accept work</p>
                  </div>
                </div>
                <span className="text-xl font-black text-slate-950 dark:text-white">{partnerStats.online}</span>
              </div>
              <div className="flex items-center justify-between rounded-[26px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">Verified partners</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ready for secure assignments</p>
                  </div>
                </div>
                <span className="text-xl font-black text-slate-950 dark:text-white">{partnerStats.verified}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Filtered order ledger"
          subtitle="Readable operations table with customer, payment, rider, and assignment state in one glance."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="px-3 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Store</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Rider</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Placed</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length ? (
                  filteredOrders.map((order) => {
                    const status = String(order.status || "pending").toLowerCase();
                    const statusTone =
                      status === "delivered"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : status === "pending"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300";

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/5"
                      >
                        <td className="px-3 py-4 align-top">
                          <div className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                            #{order.id.slice(-8).toUpperCase()}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {order.assignmentPending ? "Assignment pending" : "Assigned"}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="text-sm font-semibold text-slate-950 dark:text-white">
                            {order.name || "Unknown customer"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {order.phone || order.userId || "No phone"}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                          {order.storeName || order.shopName || order.store || "Unknown store"}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusTone}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                          <div className="font-semibold text-slate-950 dark:text-white">
                            {order.paymentMethod || order.paymentProvider || "Unknown"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {order.paymentStatus || "No status"}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                          <div className="font-semibold text-slate-950 dark:text-white">
                            {order.courierName || "Not assigned"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {order.courierPhone || "No rider phone"}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-sm font-semibold text-slate-950 dark:text-white">
                          {formatCurrency(order.total || 0)}
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-500 dark:text-slate-400">
                          {formatDateTime(order.createdAt || order.confirmedAt || order.lastUpdatedAt)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      No orders match the current filter set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Recent customer accounts"
            subtitle="Quick customer reference for support, order tracing, and account verification."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {recentUsers.length ? (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-sm font-black text-white">
                      {getInitials(user.name || user.email || user.id)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {user.name || "Unnamed account"}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.email || "No email"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {user.phone || user.role || "Customer account"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No user accounts available yet.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Partner readiness roster"
            subtitle="See who is online, verified, and currently carrying a delivery."
          >
            <div className="grid gap-4">
              {partnerRoster.length ? (
                partnerRoster.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-black text-white">
                        {getInitials(partner.name || partner.email || partner.id)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {partner.name || "Unnamed partner"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {partner.phone || partner.email || "No contact"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {partner.currentOrderId ? `Active order: ${partner.currentOrderId.slice(-6).toUpperCase()}` : "No active order"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          partner.isOnline
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {partner.isOnline ? "Online" : "Offline"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          partner.isVerified
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                        }`}
                      >
                        {partner.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No partner accounts available yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
