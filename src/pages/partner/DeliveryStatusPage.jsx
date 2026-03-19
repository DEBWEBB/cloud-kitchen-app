import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { releasePartnerForOrder } from "../../utils/assignDeliveryPartner";
import maskPhone from "../../utils/maskPhone";
import useLocationUpdater from "../../utils/useLocationUpdater";
import "leaflet/dist/leaflet.css";

const statusOptions = ["pending", "picked", "on the way", "delivered"];

const deliveryIcon = new L.Icon({
  iconUrl: "/delivery-icon.png",
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -28],
});

export default function DeliveryStatusPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { location, isTracking, startUpdating, stopUpdating } = useLocationUpdater();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [userCodeInput, setUserCodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (!user || !orderId) return;

    const unsubscribe = onSnapshot(doc(db, "orders", orderId), (snapshot) => {
      setLoading(false);

      if (!snapshot.exists()) {
        setOrder(null);
        toast.error("Order not found");
        return;
      }

      const data = snapshot.data();
      if (data.courierId && data.courierId !== user.uid) {
        setHasAccess(false);
        toast.error("Permission denied");
        return;
      }

      setHasAccess(true);
      setOrder({ id: snapshot.id, ...data });
      setStatus(data.status || "pending");
    });

    return () => {
      unsubscribe();
      stopUpdating();
    };
  }, [orderId, stopUpdating, user]);

  const mapCenter = useMemo(() => {
    if (location) return [location.lat, location.lng];
    if (order?.courierLocation) return [order.courierLocation.lat, order.courierLocation.lng];
    if (order?.location) return [order.location.lat, order.location.lng];
    return [22.5726, 88.3639];
  }, [location, order]);

  const handleStatusUpdate = async (nextStatus = status) => {
    if (!orderId) return;

    try {
      setSaving(true);
      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus,
        lastUpdatedAt: Timestamp.now(),
      });
      toast.success(`Status updated to ${nextStatus}`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Status update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (userCodeInput.trim() !== order?.secretCode) {
      toast.error("Incorrect secret code.");
      return;
    }

    try {
      setSaving(true);
      await updateDoc(doc(db, "orders", orderId), {
        status: "delivered",
        deliveredAt: Timestamp.now(),
      });

      if (user?.uid) {
        await releasePartnerForOrder(user.uid, {
          delivered: true,
          earningsDelta: order?.partnerShare || 0,
        });
      }

      stopUpdating();
      toast.success("Delivery confirmed");
    } catch (error) {
      console.error("Delivery confirm error:", error);
      toast.error("Delivery confirmation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container pt-28">
        <div className="card flex min-h-[360px] items-center justify-center p-10">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin" />
            <span>Loading delivery details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess || !order) {
    return (
      <div className="page-container pt-28">
        <div className="card p-10 text-center">
          <p className="section-title mb-2 text-lg">Unable to access this delivery</p>
          <p className="muted">This order either does not exist or is assigned to another partner.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 dark:bg-gray-950">
      <div className="page-container space-y-6">
        <section className="card p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="chip mb-3 inline-flex bg-primary-soft text-primary-dark dark:bg-pink-900/30 dark:text-pink-300">
                Live delivery control
              </span>
              <h1 className="section-title">Manage Delivery</h1>
              <p className="muted mt-2">
                Order ID: <span className="font-mono">{orderId}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startUpdating(orderId)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <LocateFixed size={16} />
                {isTracking ? "Tracking Active" : "Start Live Tracking"}
              </button>
              <button
                onClick={stopUpdating}
                className="btn-ghost inline-flex items-center gap-2"
              >
                <Navigation size={16} />
                Stop Tracking
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order Snapshot</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Customer</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {order.name || "Unknown"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Phone</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {maskPhone(order.phone)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800 sm:col-span-2">
                  <p className="muted">Delivery address</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {order.address || "No address available"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Current status</p>
                  <p className="mt-1 font-semibold capitalize text-primary dark:text-pink-300">
                    {order.status}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Secret code</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {order.secretCode || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Update Status</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setStatus(option);
                      handleStatusUpdate(option);
                    }}
                    disabled={saving}
                    className={`chip capitalize ${
                      status === option
                        ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow"
                        : "hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delivery</h2>
              <p className="muted mt-2">
                Match the customer secret code before marking the order as delivered.
              </p>
              <input
                type="text"
                placeholder="Enter customer code"
                value={userCodeInput}
                onChange={(event) => setUserCodeInput(event.target.value)}
                className="input-style mt-4"
              />
              <button
                onClick={handleConfirmDelivery}
                disabled={saving}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                Confirm Delivery
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Map</h2>
                  <p className="muted mt-1">
                    {isTracking
                      ? "Location is syncing in real time."
                      : "Start tracking to share live courier position."}
                  </p>
                </div>
                <span
                  className={`chip ${
                    isTracking
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : ""
                  }`}
                >
                  {isTracking ? "Live" : "Idle"}
                </span>
              </div>

              <div className="h-[420px]">
                <MapContainer
                  center={mapCenter}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {order.location && (
                    <Marker position={[order.location.lat, order.location.lng]}>
                      <Popup>
                        <div className="text-sm">
                          <strong>Customer location</strong>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {(location || order.courierLocation) && (
                    <Marker
                      position={[
                        (location || order.courierLocation).lat,
                        (location || order.courierLocation).lng,
                      ]}
                      icon={deliveryIcon}
                    >
                      <Popup>Courier live position</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Notes</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <MapPin className="mt-0.5 text-primary dark:text-pink-300" size={18} />
                  <p className="muted">
                    Use live tracking while the order is in transit so customers can see your position.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <CheckCircle2 className="mt-0.5 text-emerald-500" size={18} />
                  <p className="muted">
                    Only confirm delivery after matching the customer secret handoff code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
