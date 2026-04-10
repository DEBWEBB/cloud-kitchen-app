import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import {
  Camera,
  CheckCircle2,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { releasePartnerForOrder } from "../../utils/assignDeliveryPartner";
import maskPhone from "../../utils/maskPhone";
import { syncPartnerPresence } from "../../utils/syncPartnerPresence";
import { uploadDeliveryProof } from "../../utils/uploadDeliveryProof";
import {
  completeOrderSecurity,
  verifyOrderSecurityCode,
} from "../../utils/orderSecurity";
import useLocationUpdater from "../../utils/useLocationUpdater";
import useRouteMetrics from "../../hooks/useRouteMetrics";
import DeliveryGoogleMap from "../../components/DeliveryGoogleMap";

const statusOptions = ["pending", "picked", "on the way", "delivered"];
const proofConfig = {
  pickup: {
    fieldName: "pickupProofUrl",
    timestampName: "pickupProofCapturedAt",
    label: "pickup proof",
    facingMode: "environment",
  },
  "pickup-selfie": {
    fieldName: "pickupSelfieUrl",
    timestampName: "pickupSelfieCapturedAt",
    label: "pickup selfie",
    facingMode: "user",
  },
  delivery: {
    fieldName: "deliveryProofUrl",
    timestampName: "deliveryProofCapturedAt",
    label: "delivery proof",
    facingMode: "environment",
  },
  "delivery-selfie": {
    fieldName: "deliverySelfieUrl",
    timestampName: "deliverySelfieCapturedAt",
    label: "delivery selfie",
    facingMode: "user",
  },
};

export default function DeliveryStatusPage() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { location, isTracking, startUpdating, stopUpdating } = useLocationUpdater();
  const webcamRef = useRef(null);
  const deniedToastShownRef = useRef(false);
  const missingOrderToastShownRef = useRef(false);
  const previousStatusRef = useRef("");

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("");
  const [userCodeInput, setUserCodeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [proofStage, setProofStage] = useState("");
  const [proofUploading, setProofUploading] = useState(false);
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
  const courierLocation = useMemo(
    () => order?.courierLocation || null,
    [order?.courierLocation?.lat, order?.courierLocation?.lng, order?.courierLocation?.updatedAt]
  );
  const customerLocation = useMemo(
    () => order?.location || null,
    [order?.location?.lat, order?.location?.lng]
  );

  useEffect(() => {
    if (!user || !orderId) return;

    const unsubscribe = onSnapshot(
      doc(db, "orders", orderId),
      (snapshot) => {
        setLoading(false);

        if (!snapshot.exists()) {
          setOrder(null);
          if (!missingOrderToastShownRef.current) {
            toast.error("Order not found");
            missingOrderToastShownRef.current = true;
          }
          return;
        }

        missingOrderToastShownRef.current = false;

        const data = snapshot.data();
        if (data.courierId && data.courierId !== user.uid) {
          setHasAccess(false);
          if (!deniedToastShownRef.current) {
            toast.error("Missing or insufficient permissions.");
            deniedToastShownRef.current = true;
          }
          return;
        }

        deniedToastShownRef.current = false;
        setHasAccess(true);
        const { secretCode: _secretCode, ...partnerSafeData } = data;
        setOrder({ id: snapshot.id, ...partnerSafeData });
        setStatus(data.status || "pending");
      },
      (error) => {
        console.error("Delivery status listener failed:", error);
        setLoading(false);
        setHasAccess(false);
        if (!deniedToastShownRef.current) {
          toast.error("Could not load delivery details.");
          deniedToastShownRef.current = true;
        }
      }
    );

    return () => {
      unsubscribe();
      stopUpdating();
    };
  }, [orderId, stopUpdating, user?.uid]);

  useEffect(() => {
    const currentStatus = String(order?.status || "").toLowerCase();
    if (currentStatus === "delivered" && previousStatusRef.current !== "delivered") {
      setShowCompletionCelebration(true);
    }
    previousStatusRef.current = currentStatus;
  }, [order?.status]);

  const mapCenter = useMemo(() => {
    if (location) return [location.lat, location.lng];
    if (courierLocation) return [courierLocation.lat, courierLocation.lng];
    if (customerLocation) return [customerLocation.lat, customerLocation.lng];
    return [22.5726, 88.3639];
  }, [courierLocation, customerLocation, location]);
  const routeMetrics = useRouteMetrics(
    location || courierLocation,
    customerLocation,
    Boolean(customerLocation && (location || courierLocation)),
    15000
  );
  const handleStatusUpdate = async (nextStatus = status) => {
    if (!orderId) return;

    if (nextStatus === "picked" && (!order?.pickupProofUrl || !order?.pickupSelfieUrl)) {
      setProofStage(!order?.pickupProofUrl ? "pickup" : "pickup-selfie");
      toast.error("Capture both pickup proof and pickup selfie before marking the order as picked.");
      return;
    }

    if (nextStatus === "on the way" && (!order?.pickupProofUrl || !order?.pickupSelfieUrl)) {
      setProofStage(!order?.pickupProofUrl ? "pickup" : "pickup-selfie");
      toast.error("Pickup proof and pickup selfie are required before moving to on the way.");
      return;
    }

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
    if (!order?.deliveryProofUrl || !order?.deliverySelfieUrl) {
      setProofStage(!order?.deliveryProofUrl ? "delivery" : "delivery-selfie");
      toast.error("Capture both delivery proof and delivery selfie before confirming delivery.");
      return;
    }

    try {
      setSaving(true);
      await verifyOrderSecurityCode({
        orderId,
        code: userCodeInput.trim(),
      });

      await updateDoc(doc(db, "orders", orderId), {
        status: "delivered",
        deliveredAt: Timestamp.now(),
      });

      if (user?.uid) {
        let shouldGoOfflineAfterDelivery = false;
        try {
          const partnerSnapshot = await getDoc(doc(db, "partners", user.uid));
          if (partnerSnapshot.exists()) {
            const partnerData = partnerSnapshot.data() || {};
            const shiftEndsAtMs =
              typeof partnerData?.shiftEndsAt?.toDate === "function"
                ? partnerData.shiftEndsAt.toDate().getTime()
                : typeof partnerData?.shiftEndsAt?.seconds === "number"
                ? partnerData.shiftEndsAt.seconds * 1000
                : 0;

            shouldGoOfflineAfterDelivery =
              Boolean(partnerData?.shiftExpiryPending) ||
              (shiftEndsAtMs > 0 && Date.now() >= shiftEndsAtMs);

            if (shouldGoOfflineAfterDelivery) {
              await updateDoc(doc(db, "partners", user.uid), {
                isOnline: false,
                currentOrderId: null,
                shiftStartedAt: null,
                shiftEndsAt: null,
                shiftExpiryPending: false,
                shiftEndedAt: Timestamp.now(),
                lastAvailabilityUpdate: Timestamp.now(),
              });
            }
          }
        } catch (partnerError) {
          console.error("Partner shift close check failed:", partnerError);
        }

        await releasePartnerForOrder(user.uid, {
          delivered: true,
          earningsDelta: order?.partnerShare || 0,
        });

        await syncPartnerPresence({
          isOnline: !shouldGoOfflineAfterDelivery,
          location: shouldGoOfflineAfterDelivery ? null : location || order?.courierLocation || null,
          name: order?.courierName || user.email || "",
          phone: order?.courierPhone || "",
          isVerified: Boolean(order?.partnerVerified),
          currentOrderId: null,
        }).catch((error) => {
          console.error("Partner release sync failed:", error);
        });
      }

      stopUpdating();
      await completeOrderSecurity({ orderId }).catch((error) => {
        console.error("Order security completion failed:", error);
      });
      setShowCompletionCelebration(true);
      toast.success("Delivery confirmed");
    } catch (error) {
      console.error("Delivery confirm error:", error);
      toast.error("Delivery confirmation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleProofCapture = async () => {
    if (!orderId || !proofStage) return;
    const config = proofConfig[proofStage];
    if (!config) {
      toast.error("Invalid proof capture stage.");
      return;
    }

    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      toast.error("Could not capture image from camera.");
      return;
    }

    try {
      setProofUploading(true);
      const response = await fetch(screenshot);
      const blob = await response.blob();
      const proofFile = new File([blob], `${proofStage}-proof.jpg`, {
        type: "image/jpeg",
      });
      const proofUrl = await uploadDeliveryProof({
        orderId,
        stage: proofStage,
        sourceFile: proofFile,
      });

      await updateDoc(doc(db, "orders", orderId), {
        [config.fieldName]: proofUrl,
        [config.timestampName]: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
      });

      toast.success(`${config.label} uploaded.`);
      setProofStage("");
    } catch (error) {
      console.error("Proof capture failed:", error);
      toast.error(
        error?.code === "permission-denied"
          ? "Proof image uploaded, but Firestore rules blocked saving it to the order. Deploy the updated rules and try again."
          : error.message || "Failed to upload proof image."
      );
    } finally {
      setProofUploading(false);
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

  const deliveryCompleted = String(order?.status || "").toLowerCase() === "delivered";

  return (
    <div className="min-h-screen bg-gray-50 pt-24 dark:bg-gray-950">
      <div className="page-container space-y-6">
        <AnimatePresence>
          {showCompletionCelebration ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="relative overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.22),_transparent_42%),linear-gradient(135deg,_rgba(236,253,245,0.95),_rgba(255,247,237,0.92))] p-6 shadow-[0_30px_80px_-40px_rgba(16,185,129,0.45)] dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_40%),linear-gradient(135deg,_rgba(6,78,59,0.55),_rgba(88,28,135,0.18))]"
            >
              <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-emerald-300/40 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-300/25 blur-3xl" />
              <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <motion.div
                    initial={{ rotate: -8, scale: 0.88 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16 }}
                    className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg"
                  >
                    <CheckCircle2 size={30} />
                  </motion.div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-700 dark:border-white/10 dark:bg-white/10 dark:text-emerald-200">
                      <Sparkles size={13} />
                      Order Completed
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-gray-950 dark:text-white md:text-3xl">
                      Delivery successfully verified and closed.
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-200">
                      Proofs are saved, the handoff code matched, and this trip is now marked as completed for both the customer and the delivery partner.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompletionCelebration(false)}
                  className="btn-ghost self-start md:self-center"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

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
                  <p className="muted">Security handoff</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    Customer-only code verification
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Pickup & Delivery Proof
                  </h2>
                  <p className="muted mt-2">
                    Capture proof photo plus a partner selfie at pickup and again at final handoff for stronger delivery security.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setProofStage("pickup")}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {order?.pickupProofUrl ? "Retake Pickup Photo" : "Take Pickup Photo"}
                  </button>
                  <button
                    onClick={() => setProofStage("pickup-selfie")}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {order?.pickupSelfieUrl ? "Retake Pickup Selfie" : "Take Pickup Selfie"}
                  </button>
                  <button
                    onClick={() => setProofStage("delivery")}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {order?.deliveryProofUrl ? "Retake Delivery Photo" : "Take Delivery Photo"}
                  </button>
                  <button
                    onClick={() => setProofStage("delivery-selfie")}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {order?.deliverySelfieUrl ? "Retake Delivery Selfie" : "Take Delivery Selfie"}
                  </button>
                </div>
              </div>

              {proofStage && (
                <div className="mt-5 rounded-3xl border border-pink-100 bg-pink-50/70 p-4 dark:border-pink-900/40 dark:bg-pink-950/20">
                  <h3 className="font-semibold capitalize text-gray-900 dark:text-white">
                    Capture {proofConfig[proofStage]?.label || proofStage}
                  </h3>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                      facingMode: proofConfig[proofStage]?.facingMode || "environment",
                    }}
                    className="mt-4 h-[240px] w-full rounded-2xl border border-pink-200 object-cover dark:border-pink-900/40"
                  />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleProofCapture}
                      disabled={proofUploading}
                      className="btn-primary"
                    >
                      {proofUploading ? "Uploading..." : `Upload ${proofStage} proof`}
                    </button>
                    <button
                      onClick={() => setProofStage("")}
                      disabled={proofUploading}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Pickup photo</p>
                  {order?.pickupProofUrl ? (
                    <img
                      src={order.pickupProofUrl}
                      alt="Pickup proof"
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      No pickup proof captured yet.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Pickup selfie</p>
                  {order?.pickupSelfieUrl ? (
                    <img
                      src={order.pickupSelfieUrl}
                      alt="Pickup selfie"
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      No pickup selfie captured yet.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Delivery photo</p>
                  {order?.deliveryProofUrl ? (
                    <img
                      src={order.deliveryProofUrl}
                      alt="Delivery proof"
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      No delivery proof captured yet.
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="muted">Delivery selfie</p>
                  {order?.deliverySelfieUrl ? (
                    <img
                      src={order.deliverySelfieUrl}
                      alt="Delivery selfie"
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      No delivery selfie captured yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delivery</h2>
              <p className="muted mt-2">
                Match the customer secret code before marking the order as delivered.
              </p>
              {deliveryCompleted ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-[28px] border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                        Completed
                      </p>
                      <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                        This order is fully delivered and verified.
                      </p>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        You can still review the proof gallery and map trail from this page.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : null}
              <label htmlFor="delivery_secret_code" className="mt-4 block text-sm font-medium text-gray-900 dark:text-white">
                Customer secret code
              </label>
              <input
                id="delivery_secret_code"
                name="delivery_secret_code"
                type="text"
                placeholder="Enter customer code"
                value={userCodeInput}
                onChange={(event) => setUserCodeInput(event.target.value)}
                className="input-style mt-4"
              />
              <button
                onClick={handleConfirmDelivery}
                disabled={saving || deliveryCompleted}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <ShieldCheck size={16} />
                {deliveryCompleted ? "Delivery Completed" : "Confirm Delivery"}
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
                  {routeMetrics.sourceLabel ? (
                    <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      {routeMetrics.sourceLabel}
                      {typeof routeMetrics.distanceKm === "number"
                        ? ` • ${routeMetrics.distanceKm} km • ${routeMetrics.travelMinutes || 0} min`
                        : ""}
                    </p>
                  ) : null}
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
                <DeliveryGoogleMap
                  center={{ lat: mapCenter[0], lng: mapCenter[1] }}
                  customerLocation={order.location}
                  courierLocation={location || order.courierLocation}
                  routePath={routeMetrics.geometry}
                  customerLabel="Customer location"
                  courierLabel="Courier live position"
                />
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
