import { Link } from "react-router-dom";
import { Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import useRouteMetrics from "../hooks/useRouteMetrics";
import maskPhone from "../utils/maskPhone";

export default function CustomerDeliveryLiveCard({
  order,
  compact = false,
  paymentStatus = null,
}) {
  if (!order) return null;

  const courierLocation = order.courierLocation || null;
  const deliveryLocation = order.location || null;
  const routeMetrics = useRouteMetrics(
    courierLocation,
    deliveryLocation,
    Boolean(
      courierLocation &&
        deliveryLocation &&
        String(order.status || "").toLowerCase() !== "delivered"
    ),
    15000
  );
  const courierDistance =
    typeof routeMetrics.distanceKm === "number"
      ? routeMetrics.distanceKm.toFixed(1)
      : null;
  const etaMinutes =
    String(order.status || "").toLowerCase() === "delivered"
      ? 0
      : routeMetrics.travelMinutes || 25;
  const hasPartnerContext =
    Boolean(order.courierName) ||
    Boolean(order.deliveryDelayNotice) ||
    Boolean(order.assignmentPending) ||
    Boolean(order.partnerVerified);

  if (!hasPartnerContext) {
    return null;
  }

  return (
    <div className="rounded-[26px] border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
            Live partner
          </p>
          <h3 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
            {order.courierName || (order.assignmentPending ? "Assigning partner" : "Partner pending")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {order.courierPhone ? maskPhone(order.courierPhone) : "Phone unlocks after assignment"}
          </p>
        </div>

        {!compact ? (
          <Link to={`/track/${order.id}`} className="btn-primary text-center">
            Open Tracker
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniTile
          icon={Clock3}
          label="ETA"
          value={String(order.status || "").toLowerCase() === "delivered" ? "Completed" : `${etaMinutes} min`}
        />
        <MiniTile
          icon={MapPin}
          label="Distance"
          value={courierDistance ? `${courierDistance} km away` : "Tracking soon"}
        />
        <MiniTile
          icon={ShieldCheck}
          label="Security"
          value={order.partnerVerified ? "Verified rider" : "Verification pending"}
        />
      </div>

      {routeMetrics.sourceLabel ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
          Route basis: <span className="font-semibold">{routeMetrics.sourceLabel}</span>
        </div>
      ) : null}

      {paymentStatus?.status ? (
        <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
          Payment status: <span className="font-semibold">{paymentStatus.status}</span>
        </div>
      ) : null}

      {order.deliveryDelayNotice ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
          {order.deliveryDelayNotice}
        </div>
      ) : null}

      {compact && (
        <Link to={`/track/${order.id}`} className="btn-ghost mt-4 inline-flex">
          <Truck size={16} className="mr-2 inline-flex" />
          Open Tracker
        </Link>
      )}
    </div>
  );
}

function MiniTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
