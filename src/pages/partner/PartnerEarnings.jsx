import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import toast from "react-hot-toast";
import {
  CalendarRange,
  Coins,
  PackageCheck,
  Route,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const formatCurrency = (value = 0) =>
  `Rs.${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

const formatCurrencyPrecise = (value = 0) =>
  `Rs.${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDayLabel = (value) =>
  value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return "Time unavailable";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStoreLabel = (order) => order.storeName || order.store || "HungryBox";

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export default function PartnerEarnings() {
  const [user] = useAuthState(auth);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const deliveredOrdersQuery = query(
      collection(db, "orders"),
      where("courierId", "==", user.uid),
      where("status", "==", "delivered")
    );

    const unsubscribe = onSnapshot(
      deliveredOrdersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((left, right) => {
            const leftTime =
              toDate(left.deliveredAt || left.confirmedAt || left.createdAt)?.getTime() || 0;
            const rightTime =
              toDate(right.deliveredAt || right.confirmedAt || right.createdAt)?.getTime() || 0;
            return rightTime - leftTime;
          });

        setOrders(nextOrders);
      },
      (error) => {
        console.error("Partner earnings listener failed:", error);
        toast.error("Could not load partner earnings.");
        setOrders([]);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const analytics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    const previousWindowStart = new Date(today);
    previousWindowStart.setDate(today.getDate() - 13);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalEarnings = orders.reduce((sum, order) => sum + Number(order.partnerShare || 0), 0);
    const totalDelivered = orders.length;
    const totalDistance = orders.reduce((sum, order) => sum + Number(order.distanceKm || 0), 0);
    const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalItems = orders.reduce(
      (sum, order) =>
        sum +
        (order.items || []).reduce(
          (itemSum, item) => itemSum + Number(item.quantity || 1),
          0
        ),
      0
    );

    const dailyMap = new Map();
    const storeMap = new Map();
    let todayEarnings = 0;
    let currentWeekEarnings = 0;
    let previousWeekEarnings = 0;
    let currentMonthEarnings = 0;

    orders.forEach((order) => {
      const amount = Number(order.partnerShare || 0);
      const distance = Number(order.distanceKm || 0);
      const orderDate =
        toDate(order.deliveredAt || order.confirmedAt || order.createdAt) || new Date();
      const dayKey = formatDayLabel(orderDate);
      const storeName = getStoreLabel(order);
      const itemsCount = (order.items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 1),
        0
      );

      const dayBucket = dailyMap.get(dayKey) || {
        label: dayKey,
        earnings: 0,
        deliveries: 0,
      };
      dayBucket.earnings += amount;
      dayBucket.deliveries += 1;
      dailyMap.set(dayKey, dayBucket);

      const storeBucket = storeMap.get(storeName) || {
        name: storeName,
        earnings: 0,
        deliveries: 0,
        distance: 0,
      };
      storeBucket.earnings += amount;
      storeBucket.deliveries += 1;
      storeBucket.distance += distance;
      storeMap.set(storeName, storeBucket);

      if (isSameDay(orderDate, today)) {
        todayEarnings += amount;
      }

      if (orderDate >= sevenDaysAgo) {
        currentWeekEarnings += amount;
      } else if (orderDate >= previousWindowStart && orderDate < sevenDaysAgo) {
        previousWeekEarnings += amount;
      }

      if (
        orderDate.getMonth() === currentMonth &&
        orderDate.getFullYear() === currentYear
      ) {
        currentMonthEarnings += amount;
      }

      storeBucket.items = (storeBucket.items || 0) + itemsCount;
    });

    const dailySeries = [...dailyMap.values()].slice(-7);
    const storeSeries = [...storeMap.values()].sort((left, right) => right.earnings - left.earnings);
    const latestOrder = orders[0] || null;
    const bestDay =
      [...dailyMap.values()].sort((left, right) => right.earnings - left.earnings)[0] || null;
    const bestStore = storeSeries[0] || null;
    const weeklyGrowth =
      previousWeekEarnings > 0
        ? Math.round(((currentWeekEarnings - previousWeekEarnings) / previousWeekEarnings) * 100)
        : currentWeekEarnings > 0
        ? 100
        : 0;

    return {
      totalEarnings,
      totalDelivered,
      avgPerOrder: totalDelivered ? totalEarnings / totalDelivered : 0,
      avgDistance: totalDelivered ? totalDistance / totalDelivered : 0,
      avgOrderValue: totalDelivered ? totalOrderValue / totalDelivered : 0,
      totalItems,
      todayEarnings,
      currentWeekEarnings,
      previousWeekEarnings,
      currentMonthEarnings,
      weeklyGrowth,
      latestOrder,
      bestDay,
      bestStore,
      dailySeries,
      storeSeries,
    };
  }, [orders]);

  const earningsChartData = useMemo(
    () => ({
      labels: analytics.dailySeries.map((entry) => entry.label),
      datasets: [
        {
          label: "Daily earnings",
          data: analytics.dailySeries.map((entry) => entry.earnings),
          backgroundColor: "rgba(244,114,182,0.82)",
          borderRadius: 14,
          borderSkipped: false,
        },
      ],
    }),
    [analytics.dailySeries]
  );

  const earningsChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrencyPrecise(context.parsed.y),
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#94a3b8",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(148,163,184,0.12)",
          },
          ticks: {
            color: "#94a3b8",
            callback: (value) => `Rs.${value}`,
          },
        },
      },
    }),
    []
  );

  const storeBreakdownData = useMemo(
    () => ({
      labels: analytics.storeSeries.map((entry) => entry.name),
      datasets: [
        {
          label: "Store share",
          data: analytics.storeSeries.map((entry) => entry.earnings),
          backgroundColor: [
            "#f472b6",
            "#fb923c",
            "#38bdf8",
            "#34d399",
            "#a78bfa",
          ],
          borderWidth: 0,
        },
      ],
    }),
    [analytics.storeSeries]
  );

  const storeBreakdownOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#cbd5e1",
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${formatCurrencyPrecise(context.parsed)}`,
          },
        },
      },
    }),
    []
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.14),_transparent_24%),linear-gradient(to_bottom,_#111827,_#020617_42%)] pb-28 pt-20 text-white">
      <div className="page-container space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.9)] backdrop-blur md:p-8"
        >
          <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-pink-200">
                <Sparkles size={14} />
                Partner Performance Center
              </div>
              <h1 className="text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl md:text-5xl">
                Earnings, delivery history, and trend intelligence.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                This dashboard now references your completed deliveries, compares
                current performance with recent days, and surfaces the stores,
                payouts, and distance patterns that matter most.
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 xl:min-w-[360px] xl:max-w-[380px]">
              <InsightPill
                icon={CalendarRange}
                label="Today"
                value={formatCurrency(analytics.todayEarnings)}
              />
              <InsightPill
                icon={TrendingUp}
                label="7-day trend"
                value={`${analytics.weeklyGrowth >= 0 ? "+" : ""}${analytics.weeklyGrowth}%`}
              />
              <InsightPill
                icon={Store}
                label="Top store"
                value={analytics.bestStore?.name || "Waiting for more trips"}
              />
              <InsightPill
                icon={Route}
                label="Avg route"
                value={`${analytics.avgDistance.toFixed(1)} km`}
              />
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Earnings"
            value={analytics.totalEarnings}
            formatter={formatCurrency}
            accent="from-emerald-500 to-teal-400"
            icon={Coins}
            detail={`${analytics.totalDelivered} completed deliveries`}
          />
          <MetricCard
            title="Average / Order"
            value={analytics.avgPerOrder}
            formatter={formatCurrencyPrecise}
            accent="from-fuchsia-500 to-pink-500"
            icon={TrendingUp}
            detail={`${formatCurrency(analytics.currentWeekEarnings)} this week`}
          />
          <MetricCard
            title="Average Basket Value"
            value={analytics.avgOrderValue}
            formatter={formatCurrencyPrecise}
            accent="from-sky-500 to-cyan-400"
            icon={PackageCheck}
            detail={`${analytics.totalItems} total items delivered`}
          />
          <MetricCard
            title="Current Month"
            value={analytics.currentMonthEarnings}
            formatter={formatCurrency}
            accent="from-orange-500 to-amber-400"
            icon={CalendarRange}
            detail={
              analytics.bestDay
                ? `Best day: ${analytics.bestDay.label}`
                : "Waiting for payout history"
            }
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <PanelCard
              title="Last 7 days earnings"
              subtitle="Track what you earned per day from your most recent completed deliveries."
              icon={Coins}
            >
              <div className="h-[260px] sm:h-[320px]">
                {analytics.dailySeries.length ? (
                  <Bar data={earningsChartData} options={earningsChartOptions} />
                ) : (
                  <EmptyState message="Complete a few deliveries to unlock the earnings trend graph." />
                )}
              </div>
            </PanelCard>

            <PanelCard
              title="Recent completed deliveries"
              subtitle="Reference your latest finished trips, payouts, store source, and delivery timing."
              icon={PackageCheck}
            >
              <div className="space-y-3">
                {orders.length ? (
                  orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="rounded-[24px] border border-white/10 bg-slate-900/55 p-4 transition hover:border-pink-400/30 hover:bg-slate-900/70"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                              Delivered
                            </span>
                            <span className="rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-slate-300">
                              #{order.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <h3 className="mt-3 text-xl font-bold text-white">
                            {getStoreLabel(order)}
                          </h3>
                          <p className="mt-2 text-sm text-slate-300">
                            {formatDateTime(order.deliveredAt || order.confirmedAt || order.createdAt)}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <DataChip label="Partner share" value={formatCurrency(order.partnerShare || 0)} />
                          <DataChip label="Order total" value={formatCurrency(order.total || 0)} />
                          <DataChip
                            label="Route"
                            value={
                              typeof order.distanceKm === "number"
                                ? `${Number(order.distanceKm).toFixed(1)} km`
                                : "Pending"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No completed deliveries yet. Your recent trip history will appear here automatically." />
                )}
              </div>
            </PanelCard>
          </div>

          <div className="space-y-6">
            <PanelCard
              title="Store contribution"
              subtitle="See which kitchen locations are driving most of your earnings."
              icon={Store}
            >
              <div className="h-[260px] sm:h-[320px]">
                {analytics.storeSeries.length ? (
                  <Doughnut data={storeBreakdownData} options={storeBreakdownOptions} />
                ) : (
                  <EmptyState message="Store mix will appear here once completed deliveries are available." />
                )}
              </div>
            </PanelCard>

            <PanelCard
              title="Moderate performance summary"
              subtitle="Useful operational references from your past deliveries."
              icon={TrendingUp}
            >
              <div className="grid gap-3">
                <SummaryRow
                  label="Completed deliveries"
                  value={String(analytics.totalDelivered)}
                  note="Finished and verified trips"
                />
                <SummaryRow
                  label="Current week"
                  value={formatCurrency(analytics.currentWeekEarnings)}
                  note={
                    analytics.previousWeekEarnings
                      ? `${analytics.weeklyGrowth >= 0 ? "+" : ""}${analytics.weeklyGrowth}% vs previous 7 days`
                      : "First recorded week in this sample"
                  }
                />
                <SummaryRow
                  label="Best day so far"
                  value={
                    analytics.bestDay
                      ? `${analytics.bestDay.label} • ${formatCurrency(analytics.bestDay.earnings)}`
                      : "Waiting for history"
                  }
                  note={
                    analytics.bestDay
                      ? `${analytics.bestDay.deliveries} completed deliveries that day`
                      : "No daily payout pattern yet"
                  }
                />
                <SummaryRow
                  label="Best store"
                  value={analytics.bestStore?.name || "Waiting for history"}
                  note={
                    analytics.bestStore
                      ? `${formatCurrency(analytics.bestStore.earnings)} from ${analytics.bestStore.deliveries} deliveries`
                      : "Store contribution appears after deliveries"
                  }
                />
                <SummaryRow
                  label="Last completed trip"
                  value={
                    analytics.latestOrder
                      ? getStoreLabel(analytics.latestOrder)
                      : "No trip completed yet"
                  }
                  note={
                    analytics.latestOrder
                      ? `${formatDateTime(
                          analytics.latestOrder.deliveredAt ||
                            analytics.latestOrder.confirmedAt ||
                            analytics.latestOrder.createdAt
                        )} • ${formatCurrency(analytics.latestOrder.partnerShare || 0)}`
                      : "Latest delivery reference will appear here"
                  }
                />
              </div>
            </PanelCard>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value, formatter, accent, icon: Icon, detail }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-10`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              {title}
            </p>
            <div className="mt-4 text-3xl font-black text-white sm:text-4xl">
              <CountUp
                end={Number(value || 0)}
                duration={1.6}
                separator=","
                decimals={formatter === formatCurrencyPrecise ? 2 : 0}
                formattingFn={formatter}
              />
            </div>
          </div>
          <div className={`rounded-[22px] bg-gradient-to-br ${accent} p-3 text-white shadow-lg`}>
            <Icon size={22} />
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">{detail}</p>
      </div>
    </motion.div>
  );
}

function PanelCard({ title, subtitle, icon: Icon, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.9)] backdrop-blur md:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            {title}
          </p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>
        <div className="rounded-[22px] bg-white/8 p-3 text-pink-300">
          <Icon size={22} />
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function InsightPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-3 text-base font-bold leading-6 text-white sm:text-lg">{value}</p>
    </div>
  );
}

function DataChip({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-950/55 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, note }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/50 px-4 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-slate-300">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-[26px] border border-dashed border-white/10 bg-slate-950/35 p-6 text-center text-sm leading-6 text-slate-400">
      {message}
    </div>
  );
}
