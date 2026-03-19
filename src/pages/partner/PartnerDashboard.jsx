import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  Bike,
  Clock3,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import {
  reassignOrderToNextPartner,
  reservePartnerForOrder,
} from "../../utils/assignDeliveryPartner";
import maskPhone from "../../utils/maskPhone";

const quickStatuses = ["picked", "on the way"];

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubPartner = onSnapshot(doc(db, "partners", user.uid), (snapshot) => {
      setPartner(snapshot.exists() ? snapshot.data() : null);
    });

    const ordersQuery = query(collection(db, "orders"), where("courierId", "==", user.uid));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const nextOrders = snapshot.docs
        .map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
      setOrders(nextOrders);
      setLoading(false);
    });

    return () => {
      unsubPartner();
      unsubOrders();
    };
  }, [user?.uid]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "delivered"),
    [orders]
  );

  const toggleOnlineStatus = async () => {
    if (!user?.uid || !partner) return;

    try {
      await updateDoc(doc(db, "partners", user.uid), {
        isOnline: !partner.isOnline,
        lastAvailabilityUpdate: serverTimestamp(),
      });
      toast.success(partner.isOnline ? "You are offline" : "You are online");
    } catch (error) {
      console.error("Partner availability update failed:", error);
      toast.error("Could not update availability");
    }
  };

  const handleAccept = async (order) => {
    if (!user?.uid) return;

    try {
      setBusyId(order.id);
      await reservePartnerForOrder(user.uid, order.id);
      await updateDoc(doc(db, "orders", order.id), {
        acceptedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
        partnerVerified: Boolean(partner?.isVerified),
      });
      toast.success("Order accepted");
    } catch (error) {
      console.error("Accept order failed:", error);
      toast.error("Could not accept the order");
    } finally {
      setBusyId("");
    }
  };

  const handleReject = async (order) => {
    try {
      setBusyId(order.id);
      const replacement = await reassignOrderToNextPartner({
        orderId: order.id,
        storeKey: order.store || "mio",
        rejectedPartnerId: user?.uid,
      });

      await updateDoc(doc(db, "orders", order.id), {
        rejectedAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp(),
      });

      if (replacement) {
        toast.success(`Order reassigned to ${replacement.name || "another partner"}`);
      } else {
        await updateDoc(doc(db, "orders", order.id), {
          courierId: null,
          courierName: "",
          courierPhone: "",
          partnerVerified: false,
        });
        toast.error("No alternate online partner available");
      }
    } catch (error) {
      console.error("Reject order failed:", error);
      toast.error("Could not reject the order");
    } finally {
      setBusyId("");
    }
  };

  const handleQuickStatus = async (orderId, nextStatus) => {
    try {
      setBusyId(orderId);
      await updateDoc(doc(db, "orders", orderId), {
        status: nextStatus,
        lastUpdatedAt: serverTimestamp(),
      });
      toast.success(`Status updated to ${nextStatus}`);
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Could not update status");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 dark:bg-gray-950">
      <div className="page-container space-y-6">
        <section className="card overflow-hidden p-0">
          <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-8 text-white">
            <span className="chip inline-flex border border-white/20 bg-white/15 text-white">
              Partner operations
            </span>
            <h1 className="mt-4 text-3xl font-bold">Delivery Partner Dashboard</h1>
            <p className="mt-2 text-sm text-white/85">
              Manage your availability, respond to assigned orders, and keep customers updated in real time.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-4">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="muted">Partner</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {partner?.name || user?.email || "Delivery Partner"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="muted">Verification</p>
              <p className="mt-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <ShieldCheck size={16} className="text-emerald-500" />
                {partner?.isVerified ? "Verified" : "Pending"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <p className="muted">Active Orders</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {activeOrders.length}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleOnlineStatus}
              className="rounded-2xl bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <p className="muted">Availability</p>
              <p className="mt-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                {partner?.isOnline ? (
                  <ToggleRight className="text-emerald-500" />
                ) : (
                  <ToggleLeft className="text-gray-400" />
                )}
                {partner?.isOnline ? "Online" : "Offline"}
              </p>
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Assigned Orders</h2>
            <Link to="/partner/profile" className="btn-ghost">
              Edit Partner Profile
            </Link>
          </div>

          {loading ? (
            <div className="card p-10 text-center">
              <p className="muted">Loading assigned deliveries...</p>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="section-title mb-2 text-lg">No active deliveries</p>
              <p className="muted">Go online to receive the next nearby order assignment.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {activeOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="card p-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="chip bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                          Order #{order.id.slice(0, 6)}
                        </span>
                        <span className="chip capitalize">{order.status || "pending"}</span>
                        {order.partnerVerified && (
                          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Verified route
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                          <p className="muted">Customer</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.name || "Unknown customer"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {maskPhone(order.phone)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                          <p className="muted">Delivery details</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.storeName || order.store || "Store"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Total Rs.{order.total || 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800 md:col-span-2">
                          <p className="muted">Address</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.address || "No delivery address"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[280px] space-y-3">
                      {!order.acceptedAt && order.status === "pending" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            onClick={() => handleAccept(order)}
                            disabled={busyId === order.id}
                            className="btn-primary justify-center"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleReject(order)}
                            disabled={busyId === order.id}
                            className="btn-ghost justify-center"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {quickStatuses.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleQuickStatus(order.id, status)}
                              disabled={busyId === order.id}
                              className={`chip capitalize ${
                                order.status === status
                                  ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white"
                                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Clock3 size={16} />
                          <span className="text-sm">Assignment notes</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                          {order.partnerDistanceKm
                            ? `Assigned from ${order.partnerDistanceKm} km away.`
                            : "Distance will update once location is available."}
                        </p>
                      </div>

                      <Link
                        to={`/partner/status/${order.id}`}
                        className="btn-ghost flex items-center justify-center gap-2"
                      >
                        <Bike size={16} />
                        Open Live Delivery Console
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {orders.filter((order) => order.status === "delivered").length > 0 && (
          <section className="card p-6">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <PackageCheck className="text-emerald-500" size={18} />
              <h2 className="text-lg font-semibold">Completed Deliveries</h2>
            </div>
            <p className="muted mt-2">
              {orders.filter((order) => order.status === "delivered").length} orders have been completed on this account.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
