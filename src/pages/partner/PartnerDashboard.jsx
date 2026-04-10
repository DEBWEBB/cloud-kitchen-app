import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  collection,
  doc,
  Timestamp,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import Webcam from "react-webcam";
import {
  BellRing,
  Bike,
  Camera,
  Clock3,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Store,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import {
  getStoreLocation,
  reassignOrderToNextPartner,
  reservePartnerForOrder,
} from "../../utils/assignDeliveryPartner";
import haversine, {
  roundDistanceKm,
} from "../../utils/haversineDistance";
import maskPhone from "../../utils/maskPhone";
import { getApiUrl } from "../../utils/apiBaseUrl";
import { syncPartnerPresence } from "../../utils/syncPartnerPresence";
import {
  sendPartnerShiftOtp,
  verifyPartnerShiftOtp,
} from "../../utils/partnerShiftOtp";
import { uploadPartnerSecurityAsset } from "../../utils/uploadPartnerSecurityAsset";
import {
  requestNotificationPermissionSafely,
  showNotificationSafely,
} from "../../utils/safeNotification";

const quickStatuses = ["picked", "on the way"];
const todayKey = () => new Date().toISOString().slice(0, 10);
const PICKUP_RADIUS_KM = 3;
const SHIFT_DURATION_MS = 2 * 60 * 60 * 1000;
const STORE_KEYS = ["mio", "monginis"];
const LIVE_LOCATION_MIN_STEP_KM = 0.03;
const LIVE_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;
const roundLocationForMetrics = (location, precision = 3) =>
  location
    ? {
        lat: Number(location.lat.toFixed(precision)),
        lng: Number(location.lng.toFixed(precision)),
      }
    : null;

export default function PartnerDashboard() {
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const [partner, setPartner] = useState(null);
  const [orders, setOrders] = useState([]);
  const [acceptedOrderIds, setAcceptedOrderIds] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [shiftOtp, setShiftOtp] = useState("");
  const [shiftChannel, setShiftChannel] = useState("sms");
  const [shiftSending, setShiftSending] = useState(false);
  const [shiftVerifying, setShiftVerifying] = useState(false);
  const [shiftSentTo, setShiftSentTo] = useState("");
  const [otpFeatures, setOtpFeatures] = useState({
    smsOtp: false,
    emailOtp: false,
    devOtpFallback: false,
    partnerSecurityUpload: false,
  });
  const [capacityByStore, setCapacityByStore] = useState({});
  const [routeMetricsByStore, setRouteMetricsByStore] = useState({});
  const [loadingCapacity, setLoadingCapacity] = useState(true);
  const [showOnlineSelfieGate, setShowOnlineSelfieGate] = useState(false);
  const [onlineSelfieUploading, setOnlineSelfieUploading] = useState(false);
  const seenAssignedOrderIds = useRef(new Set());
  const locationWatchId = useRef(null);
  const lastPushedLocation = useRef(null);
  const shiftExpiryToastShown = useRef(false);

  const shiftChannelOptions = useMemo(() => {
    const options = [];

    if (partner?.phone && (otpFeatures.smsOtp || otpFeatures.devOtpFallback)) {
      options.push({
        value: "sms",
        label: "SMS",
        hint: maskPhone(partner.phone),
      });
    }

    if (user?.email && (otpFeatures.emailOtp || otpFeatures.devOtpFallback)) {
      options.push({
        value: "email",
        label: "Email",
        hint: user.email,
      });
    }

    return options;
  }, [otpFeatures.devOtpFallback, otpFeatures.emailOtp, otpFeatures.smsOtp, partner?.phone, user?.email]);

  const hasGeoLocation = (value) =>
    Boolean(
      value &&
        typeof value === "object" &&
        typeof value.lat === "number" &&
        typeof value.lng === "number"
    );

  const isFreshLocation = (value, fallbackTimestamp) => {
    const timestamp =
      Number(value?.updatedAt || 0) || Number(fallbackTimestamp || 0);
    if (!timestamp) {
      return false;
    }

    return Date.now() - timestamp <= LIVE_LOCATION_MAX_AGE_MS;
  };

  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    if (typeof value?.seconds === "number") return value.seconds * 1000;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const formatShiftCountdown = (millis) => {
    const minutesLeft = Math.max(0, Math.ceil(millis / 60000));
    const hours = Math.floor(minutesLeft / 60);
    const minutes = minutesLeft % 60;
    return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  };

  const getCurrentBrowserLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: Date.now(),
          }),
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });

  useEffect(() => {
    if (!user?.uid) return;

    const unsubPartner = onSnapshot(
      doc(db, "partners", user.uid),
      (snapshot) => {
        setPartner(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.error("Partner profile listener failed:", error);
        toast.error("Could not load partner profile.");
        setPartner(null);
      }
    );

    const ordersQuery = query(collection(db, "orders"), where("courierId", "==", user.uid));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const nextOrders = snapshot.docs
          .map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
        setOrders(nextOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Assigned orders listener failed:", error);
        toast.error("Could not load assigned orders.");
        setOrders([]);
        setLoading(false);
      }
    );

    return () => {
      unsubPartner();
      unsubOrders();
    };
  }, [user?.uid]);

  useEffect(() => {
    let isMounted = true;

    fetch(getApiUrl("/api/health"))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not read backend health.");
        }
        const payload = await response.json();
        if (!isMounted) return;
        setOtpFeatures({
          smsOtp: Boolean(payload?.features?.smsOtp),
          emailOtp: Boolean(payload?.features?.emailOtp),
          devOtpFallback: Boolean(payload?.features?.devOtpFallback),
          partnerSecurityUpload: Boolean(payload?.features?.partnerSecurityUpload),
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setOtpFeatures({
          smsOtp: false,
          emailOtp: false,
          devOtpFallback: false,
          partnerSecurityUpload: false,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "delivered"),
    [orders]
  );
  const acceptedOrderSet = useMemo(
    () => new Set(acceptedOrderIds),
    [acceptedOrderIds]
  );
  const isShiftVerifiedToday = partner?.shiftVerifiedDate === todayKey();
  const partnerLocation = useMemo(() => {
    if (
      hasGeoLocation(partner?.location) &&
      isFreshLocation(partner.location, partner?.lastLocationPingAt)
    ) {
      return partner.location;
    }

    if (
      hasGeoLocation(partner?.lastKnownLocation) &&
      isFreshLocation(partner.lastKnownLocation, partner?.lastLocationPingAt)
    ) {
      return partner.lastKnownLocation;
    }

    return null;
  }, [partner?.lastKnownLocation, partner?.lastLocationPingAt, partner?.location]);
  const partnerRadarLocation = useMemo(
    () => roundLocationForMetrics(partnerLocation, 3),
    [partnerLocation]
  );
  const partnerPresenceLocation = useMemo(
    () => roundLocationForMetrics(partnerLocation, 4),
    [partnerLocation]
  );
  const shiftEndsAtMs = useMemo(
    () => toMillis(partner?.shiftEndsAt),
    [partner?.shiftEndsAt]
  );
  const shiftRemainingLabel = useMemo(() => {
    if (!partner?.isOnline || !shiftEndsAtMs) return "";
    const diff = shiftEndsAtMs - Date.now();
    if (diff <= 0) {
      return activeOrders.length ? "Shift expired, finishing active delivery" : "Shift ended";
    }
    return formatShiftCountdown(diff);
  }, [activeOrders.length, partner?.isOnline, shiftEndsAtMs]);
  useEffect(() => {
    let isMounted = true;

    const loadPickupRadar = async () => {
      try {
        setLoadingCapacity(true);
        const response = await fetch(getApiUrl("/api/partner-dashboard-metrics"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: partnerRadarLocation,
            stores: STORE_KEYS,
          }),
        });
        if (!response.ok) {
          throw new Error("Could not load partner dashboard metrics.");
        }

        const payload = await response.json();
        const stores = payload?.stores || {};
        const nextCapacityByStore = {};
        const nextRouteMetricsByStore = {};

        STORE_KEYS.forEach((storeKey) => {
          const nextStoreMetrics = stores?.[storeKey] || {};
          nextCapacityByStore[storeKey] = nextStoreMetrics.capacity || {};
          if (nextStoreMetrics.routeMetrics) {
            nextRouteMetricsByStore[storeKey] = nextStoreMetrics.routeMetrics;
          }
        });

        if (isMounted) {
          setCapacityByStore(nextCapacityByStore);
          setRouteMetricsByStore(nextRouteMetricsByStore);
        }
      } catch {
        if (isMounted) {
          setCapacityByStore({});
          setRouteMetricsByStore({});
        }
      } finally {
        if (isMounted) {
          setLoadingCapacity(false);
        }
      }
    };

    loadPickupRadar();
    const intervalId = window.setInterval(loadPickupRadar, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [partnerRadarLocation?.lat, partnerRadarLocation?.lng]);
  const storeInsights = useMemo(
    () =>
      STORE_KEYS.map((storeKey) => {
        const store = getStoreLocation(storeKey);
        const routeMetrics = routeMetricsByStore[storeKey] || null;
        const fallbackDistance = partnerLocation
          ? roundDistanceKm(haversine(partnerLocation, store))
          : null;
        const distanceKm =
          typeof routeMetrics?.distanceKm === "number"
            ? routeMetrics.distanceKm
            : fallbackDistance;
        const withinRadius =
          typeof distanceKm === "number" && distanceKm <= PICKUP_RADIUS_KM;
        const capacity = capacityByStore[storeKey] || {};

        return {
          storeKey,
          store,
          distanceKm,
          travelMinutes: routeMetrics?.travelMinutes ?? null,
          routeSourceLabel:
            routeMetrics?.sourceLabel ||
            (partnerLocation ? "Straight-line fallback" : ""),
          lineDistanceKm:
            typeof routeMetrics?.lineDistanceKm === "number"
              ? routeMetrics.lineDistanceKm
              : fallbackDistance,
          withinRadius,
          capacity,
          canReceiveAlerts:
            Boolean(partner?.isOnline) &&
            Boolean(partner?.isVerified) &&
            withinRadius,
        };
      }),
    [capacityByStore, partner?.isOnline, partner?.isVerified, partnerLocation, routeMetricsByStore]
  );

  useEffect(() => {
    if (!shiftChannelOptions.length) {
      setShiftChannel("");
      return;
    }

    if (!shiftChannelOptions.some((option) => option.value === shiftChannel)) {
      setShiftChannel(shiftChannelOptions[0].value);
    }
  }, [shiftChannel, shiftChannelOptions]);

  useEffect(() => {
    if (!user?.uid || !partner?.isOnline || !("geolocation" in navigator)) {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
      return undefined;
    }

    if (locationWatchId.current !== null) {
      return undefined;
    }

    locationWatchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: Date.now(),
        };
        const previousLocation = lastPushedLocation.current;
        const movementKm = previousLocation
          ? haversine(previousLocation, nextLocation)
          : null;

        if (
          previousLocation &&
          typeof movementKm === "number" &&
          movementKm < LIVE_LOCATION_MIN_STEP_KM &&
          Date.now() - previousLocation.updatedAt < 15000
        ) {
          return;
        }

        lastPushedLocation.current = nextLocation;
        await updateDoc(doc(db, "partners", user.uid), {
          location: nextLocation,
          lastKnownLocation: nextLocation,
          lastLocationPingAt: Date.now(),
        });
      },
      (error) => {
        console.warn("Partner live location watch failed:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [partner?.isOnline, user?.uid]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      requestNotificationPermissionSafely();
    }
  }, []);

  useEffect(() => {
    if (!activeOrders.length) {
      seenAssignedOrderIds.current = new Set();
      return;
    }

    const nextIds = new Set(activeOrders.map((order) => order.id));
    const newOrders = activeOrders.filter(
      (order) => !seenAssignedOrderIds.current.has(order.id)
    );

    if (newOrders.length > 0) {
      const count = newOrders.length;
      toast.success(`${count} delivery order${count === 1 ? "" : "s"} assigned to you.`);

      showNotificationSafely("HungryBox Partner Alert", {
        body: `${count} order${count === 1 ? "" : "s"} assigned to your delivery account.`,
      });
    }

    seenAssignedOrderIds.current = nextIds;
  }, [activeOrders]);

  useEffect(() => {
    if (!user?.uid || !partner) return;

    syncPartnerPresence({
      isOnline: Boolean(partner.isOnline),
      location: partnerPresenceLocation,
      name: partner.name || user.email || "",
      phone: partner.phone || "",
      isVerified: Boolean(partner.isVerified),
      currentOrderId: partner.currentOrderId || null,
    }).catch((error) => {
      console.error("Partner presence sync failed:", error);
    });
  }, [
    partner?.currentOrderId,
    partner?.isOnline,
    partner?.isVerified,
    partner?.name,
    partner?.phone,
    partnerPresenceLocation?.lat,
    partnerPresenceLocation?.lng,
    user?.email,
    user?.uid,
  ]);

  useEffect(() => {
    if (!user?.uid || !partner?.isOnline || !shiftEndsAtMs) {
      shiftExpiryToastShown.current = false;
      return undefined;
    }

    let cancelled = false;

    const enforceShiftWindow = async () => {
      if (cancelled || Date.now() < shiftEndsAtMs) {
        return;
      }

      if (activeOrders.length > 0) {
        if (!partner?.shiftExpiryPending) {
          try {
            await updateDoc(doc(db, "partners", user.uid), {
              shiftExpiryPending: true,
              lastAvailabilityUpdate: serverTimestamp(),
            });
          } catch (error) {
            console.error("Could not mark shift expiry pending:", error);
          }
        }

        if (!shiftExpiryToastShown.current) {
          toast("Shift time ended. Finish the active delivery and the shift will close automatically.");
          shiftExpiryToastShown.current = true;
        }
        return;
      }

      try {
        await updateDoc(doc(db, "partners", user.uid), {
          isOnline: false,
          currentOrderId: null,
          shiftStartedAt: null,
          shiftEndsAt: null,
          shiftExpiryPending: false,
          shiftEndedAt: serverTimestamp(),
          lastAvailabilityUpdate: serverTimestamp(),
        });
        toast.success("Your 2-hour delivery shift has ended.");
      } catch (error) {
        console.error("Shift auto-end failed:", error);
      }
    };

    const delay = Math.max(0, shiftEndsAtMs - Date.now());
    const timeoutId = window.setTimeout(() => {
      enforceShiftWindow();
    }, delay + 250);

    if (partner?.shiftExpiryPending || Date.now() >= shiftEndsAtMs) {
      enforceShiftWindow();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    activeOrders.length,
    partner?.isOnline,
    partner?.shiftExpiryPending,
    shiftEndsAtMs,
    user?.uid,
  ]);

  const toggleOnlineStatus = async () => {
    if (!user?.uid || !partner) return;

    try {
      const nextOnlineState = !partner.isOnline;
      if (nextOnlineState && !isShiftVerifiedToday) {
        toast.error("Verify today's partner shift OTP before going online.");
        return;
      }

      if (nextOnlineState && !otpFeatures.partnerSecurityUpload) {
        toast.error(
          "Secure selfie shift check is not available on the running backend yet. Restart the backend and try again."
        );
        return;
      }

      if (nextOnlineState) {
        setShowOnlineSelfieGate(true);
        return;
      }

      const updates = {
        isOnline: nextOnlineState,
        lastAvailabilityUpdate: serverTimestamp(),
        shiftStartedAt: null,
        shiftEndsAt: null,
        shiftExpiryPending: false,
      };

      if (
        nextOnlineState &&
        !hasGeoLocation(partner.location) &&
        !hasGeoLocation(partner.lastKnownLocation)
      ) {
        try {
          const currentLocation = await getCurrentBrowserLocation();
          updates.location = currentLocation;
          updates.lastKnownLocation = currentLocation;
          updates.lastLocationPingAt = Date.now();
        } catch (error) {
          console.warn("Partner location capture failed:", error);
          toast.error("You are online, but location access is needed for automatic order assignment.");
        }
      }

      await updateDoc(doc(db, "partners", user.uid), updates);
      toast.success(partner.isOnline ? "You are offline" : "You are online");
    } catch (error) {
      console.error("Partner availability update failed:", error);
      toast.error("Could not update availability");
    }
  };

  const handleOnlineSelfieCapture = async () => {
    if (!user?.uid || !partner) return;
    if (!otpFeatures.partnerSecurityUpload) {
      toast.error(
        "Secure selfie shift check is not available on the running backend yet. Restart the backend and try again."
      );
      return;
    }

    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      toast.error("Capture a live selfie before starting the shift.");
      return;
    }

    try {
      setOnlineSelfieUploading(true);
      const response = await fetch(screenshot);
      const blob = await response.blob();
      const selfieFile = new File([blob], "shift-selfie.jpg", {
        type: "image/jpeg",
      });
      const securityAsset = await uploadPartnerSecurityAsset({
        userId: user.uid,
        kind: "shift-selfie",
        sourceFile: selfieFile,
      });

      const updates = {
        isOnline: true,
        lastAvailabilityUpdate: serverTimestamp(),
        shiftStartedAt: serverTimestamp(),
        shiftEndsAt: Timestamp.fromDate(new Date(Date.now() + SHIFT_DURATION_MS)),
        shiftExpiryPending: false,
        lastShiftSelfieAssetId: securityAsset.assetId,
        lastShiftSelfieAt: serverTimestamp(),
      };

      if (
        !hasGeoLocation(partner.location) &&
        !hasGeoLocation(partner.lastKnownLocation)
      ) {
        try {
          const currentLocation = await getCurrentBrowserLocation();
          updates.location = currentLocation;
          updates.lastKnownLocation = currentLocation;
          updates.lastLocationPingAt = Date.now();
        } catch (error) {
          console.warn("Partner location capture failed:", error);
          toast.error("Selfie captured, but location access is still needed for automatic order assignment.");
        }
      }

      await updateDoc(doc(db, "partners", user.uid), updates);
      setShowOnlineSelfieGate(false);
      toast.success("Shift started. You are online for the next 2 hours.");
    } catch (error) {
      console.error("Online selfie capture failed:", error);
      toast.error(error.message || "Could not start the secured shift.");
    } finally {
      setOnlineSelfieUploading(false);
    }
  };

  const handleSendShiftOtp = async () => {
    if (!user?.uid) return;

    if (!shiftChannel) {
      toast.error("Add a partner phone number or email before requesting OTP.");
      return;
    }

    try {
      setShiftSending(true);
      const payload = await sendPartnerShiftOtp({
        channel: shiftChannel,
        phone: partner?.phone || "",
        email: user?.email || "",
      });
      setShiftSentTo(payload.sentTo || "");
      if (payload?.devOtpPreview) {
        setShiftOtp(payload.devOtpPreview);
      }
      toast.success(
        `Shift OTP sent via ${payload.channel === "sms" ? "SMS" : "email"}${
          payload.sentTo ? ` to ${payload.sentTo}` : ""
        }.`
      );
      if (payload?.devOtpPreview) {
        toast.success("Development OTP auto-filled for local testing.");
      }
    } catch (error) {
      console.error("Shift OTP send failed:", error);
      toast.error(error.message || "Could not send shift OTP.");
    } finally {
      setShiftSending(false);
    }
  };

  const handleShiftVerification = async () => {
    if (!user?.uid) return;

    try {
      setShiftVerifying(true);
      const payload = await verifyPartnerShiftOtp(shiftOtp.trim());
      await updateDoc(doc(db, "partners", user.uid), {
        shiftVerifiedDate: payload.verifiedDate || todayKey(),
        lastShiftVerifiedAt: serverTimestamp(),
      });
      toast.success("Partner shift verified for today.");
      setShiftOtp("");
    } catch (error) {
      console.error("Shift verification failed:", error);
      toast.error(error.message || "Could not verify shift OTP.");
    } finally {
      setShiftVerifying(false);
    }
  };

  const handleAccept = async (order) => {
    if (!user?.uid) return;

    try {
      setBusyId(order.id);
      setAcceptedOrderIds((current) =>
        current.includes(order.id) ? current : [...current, order.id]
      );

      let orderSynced = false;
      try {
        await updateDoc(doc(db, "orders", order.id), {
          status: "accepted",
          acceptedAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
        });
        orderSynced = true;
      } catch (error) {
        if (error?.code !== "permission-denied") {
          throw error;
        }

        console.warn("Order accept sync blocked by Firestore rules:", error);
      }

      try {
        await reservePartnerForOrder(user.uid, order.id);
      } catch (error) {
        if (error?.code !== "permission-denied") {
          throw error;
        }

        console.warn("Partner reservation sync blocked:", error);
      }

      toast.success(
        orderSynced
          ? "Order accepted and ready for pickup."
          : "Order opened for delivery. Continue in the live console."
      );
    } catch (error) {
      console.error("Accept order failed:", error);
      setAcceptedOrderIds((current) => current.filter((id) => id !== order.id));
      toast.error("Could not prepare this order right now. Please try again.");
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
        {showOnlineSelfieGate ? (
          <div className="fixed inset-0 z-[120] bg-slate-950/65 p-4 backdrop-blur-sm">
            <div className="mx-auto flex min-h-full max-w-2xl items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="w-full rounded-[32px] border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-300">
                      Shift security capture
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-white">
                      Capture a live selfie before going online
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      This selfie is recorded as the live shift-start identity check. Your shift stays active for 2 hours and closes automatically after the last delivery if the timer has already expired.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !onlineSelfieUploading && setShowOnlineSelfieGate(false)}
                    className="btn-ghost"
                    disabled={onlineSelfieUploading}
                  >
                    Cancel
                  </button>
                </div>

                <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="h-[320px] w-full object-cover"
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleOnlineSelfieCapture}
                    disabled={onlineSelfieUploading}
                    className="btn-primary inline-flex items-center justify-center gap-2"
                  >
                    {onlineSelfieUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {onlineSelfieUploading ? "Securing shift..." : "Start secure shift"}
                  </button>
                  <button
                    type="button"
                    onClick={() => !onlineSelfieUploading && setShowOnlineSelfieGate(false)}
                    disabled={onlineSelfieUploading}
                    className="btn-ghost"
                  >
                    Not now
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        ) : null}

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="card relative overflow-hidden p-0"
        >
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.25),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_36%)]"
            animate={{ opacity: [0.65, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300 px-6 py-8 text-white">
            <span className="chip inline-flex border border-white/20 bg-white/15 text-white">
              Partner operations
            </span>
            <h1 className="mt-4 text-3xl font-bold">Delivery Partner Dashboard</h1>
            <p className="mt-2 text-sm text-white/85">
              Manage your availability, respond to assigned orders, and keep customers updated in real time.
            </p>
          </div>

          <div className="relative grid gap-4 p-6 md:grid-cols-4">
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
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                {partner?.isOnline
                  ? shiftRemainingLabel || "2-hour shift active"
                  : "Live selfie required when starting the next shift"}
              </p>
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="card p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-pink-500">
                Pickup availability radar
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Live shop distance tracer
              </h2>
              <p className="muted mt-2 max-w-2xl">
                See how far you are from each shop, whether you are inside the 3 km pickup zone, and if you are ready to receive pickup notifications.
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {partnerLocation
                ? `${storeInsights.filter((insight) => insight.canReceiveAlerts).length} pickup zone${
                    storeInsights.filter((insight) => insight.canReceiveAlerts).length === 1 ? "" : "s"
                  } ready`
                : "Turn on location to activate the pickup radar"}
            </div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {storeInsights.map((insight, index) => (
              <PickupTracerCard
                key={insight.storeKey}
                insight={insight}
                index={index}
                loading={loadingCapacity}
                hasLocation={Boolean(partnerLocation)}
              />
            ))}
          </div>
        </motion.section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Assigned Orders</h2>
            <Link to="/partner/profile" className="btn-ghost">
              Edit Partner Profile
            </Link>
          </div>

          {!isShiftVerifiedToday && (
            <div className="card border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                    Daily security gate
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    Verify today&apos;s partner shift OTP
                  </h2>
                  <p className="muted mt-2 max-w-2xl">
                    Request a one-time OTP on SMS or email, then verify it before starting the day online.
                  </p>
                  {shiftSentTo ? (
                    <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                      Latest OTP sent to {shiftSentTo}.
                    </p>
                  ) : null}
                  {!shiftChannelOptions.length ? (
                    <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-300">
                      OTP delivery is not configured for this backend yet. Enable SMS, email, or the dev fallback and restart the backend.
                    </p>
                  ) : null}
                  {otpFeatures.devOtpFallback ? (
                    <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                      Development OTP fallback is active on this backend. The OTP will auto-fill for testing.
                    </p>
                  ) : null}
                </div>
                <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                  <div className="w-full sm:max-w-[190px]">
                    <label
                      htmlFor="partner_shift_channel"
                      className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Channel
                    </label>
                    <select
                      id="partner_shift_channel"
                      name="partner_shift_channel"
                      value={shiftChannel}
                      onChange={(event) => setShiftChannel(event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-amber-900/40 dark:bg-gray-900 dark:text-white"
                    >
                      {shiftChannelOptions.length ? (
                        shiftChannelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} {option.hint ? `(${option.hint})` : ""}
                          </option>
                        ))
                      ) : (
                        <option value="">No channel available</option>
                      )}
                    </select>
                  </div>
                  <div className="w-full">
                    <label htmlFor="partner_shift_otp" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                      Shift OTP
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="partner_shift_otp"
                      id="partner_shift_otp"
                      placeholder="Enter shift OTP"
                      value={shiftOtp}
                      onChange={(event) => setShiftOtp(event.target.value)}
                      className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-amber-900/40 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendShiftOtp}
                    disabled={shiftSending || !shiftChannel}
                    className="btn-ghost whitespace-nowrap self-end disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {shiftSending ? "Sending..." : "Send OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShiftVerification}
                    disabled={shiftVerifying || !shiftOtp.trim()}
                    className="btn-primary whitespace-nowrap"
                  >
                    {shiftVerifying ? "Verifying..." : "Verify shift"}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                  whileHover={{ y: -4, scale: 1.004 }}
                  className="card group relative overflow-hidden border-white/10 bg-gradient-to-br from-slate-900/95 via-slate-900/92 to-slate-800/95 p-6 text-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.8)]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(236,72,153,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.16),_transparent_36%)] opacity-80 transition group-hover:opacity-100" />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="chip bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300">
                          Order #{order.id.slice(0, 6)}
                        </span>
                        <span className="chip capitalize">{order.status || "pending"}</span>
                        {(acceptedOrderSet.has(order.id) || order.acceptedAt) &&
                          order.status === "pending" && (
                            <span className="chip bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                              Acknowledged
                            </span>
                          )}
                        {order.partnerVerified && (
                          <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Verified route
                          </span>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
                          <p className="muted">Customer</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.name || "Unknown customer"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {maskPhone(order.phone)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
                          <p className="muted">Delivery details</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.storeName || order.store || "Store"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Total Rs.{order.total || 0}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm md:col-span-2">
                          <p className="muted">Address</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {order.address || "No delivery address"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[280px] space-y-3">
                      {order.status === "pending" && !acceptedOrderSet.has(order.id) ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <motion.button
                            onClick={() => handleAccept(order)}
                            disabled={busyId === order.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn-primary justify-center shadow-[0_18px_40px_-20px_rgba(244,114,182,0.9)]"
                          >
                            Accept
                          </motion.button>
                          <motion.button
                            onClick={() => handleReject(order)}
                            disabled={busyId === order.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            className="btn-ghost justify-center bg-white/10 text-white hover:bg-white/15"
                          >
                            Reject
                          </motion.button>
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

                      <div className="rounded-2xl bg-white/8 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Clock3 size={16} />
                          <span className="text-sm">Assignment notes</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                          {typeof order.partnerDistanceKm === "number"
                            ? `Assigned from ${order.partnerDistanceKm} km away${
                                order.partnerDistanceSource === "geoapify-route"
                                  ? " on road route"
                                  : " by straight-line fallback"
                              }${order.partnerTravelMinutes ? `, about ${order.partnerTravelMinutes} min.` : "."}`
                            : "Distance will update once location is available."}
                        </p>
                      </div>

                      <Link
                        to={`/partner/status/${order.id}`}
                        className="btn-ghost flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/15"
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

function PickupTracerCard({ insight, index, loading, hasLocation }) {
  const tracerRatio =
    typeof insight.distanceKm === "number"
      ? Math.min(insight.distanceKm / PICKUP_RADIUS_KM, 1)
      : 0;
  const tracerPercent = Math.max(10, Math.round(tracerRatio * 100));
  const outsideRadiusKm =
    typeof insight.distanceKm === "number" && insight.distanceKm > PICKUP_RADIUS_KM
      ? Number((insight.distanceKm - PICKUP_RADIUS_KM).toFixed(2))
      : 0;
  const statusLabel = !hasLocation
    ? "Location needed"
    : insight.canReceiveAlerts
      ? "Pickup alerts ready"
      : insight.withinRadius
        ? "Go online to receive alerts"
        : `Move ${outsideRadiusKm} km closer`;
  const statusTone = insight.canReceiveAlerts
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
    : insight.withinRadius
      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="rounded-[28px] border border-gray-100 bg-gray-50 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg">
            <Store size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {insight.store.label}
            </p>
            <p className="muted mt-1">
              Pickup radius: {PICKUP_RADIUS_KM} km
            </p>
          </div>
        </div>
        <span className={`chip ${statusTone}`}>{statusLabel}</span>
      </div>

      <div className="mt-6 rounded-[24px] bg-white/80 p-4 dark:bg-gray-950/70">
        <div className="relative h-16">
          <div className="absolute left-4 right-4 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gray-200 dark:bg-gray-800" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `calc(${tracerPercent}% - 16px)` }}
            transition={{ duration: 0.9, delay: index * 0.08 }}
            className={`absolute left-4 top-1/2 h-2 -translate-y-1/2 rounded-full ${
              insight.withinRadius
                ? "bg-gradient-to-r from-emerald-400 via-sky-400 to-pink-500"
                : "bg-gradient-to-r from-amber-400 to-orange-500"
            }`}
          />
          <div className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-slate-700">
            <Store size={16} />
          </div>
          <motion.div
            className="absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-gray-900"
            style={{ left: `calc(${tracerPercent}% - 4px)` }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.span
              className={`absolute inset-0 rounded-2xl ${
                insight.withinRadius ? "bg-pink-400/25" : "bg-amber-400/25"
              }`}
              animate={{ scale: [1, 1.8], opacity: [0.55, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <Bike
              size={16}
              className={insight.withinRadius ? "text-pink-500" : "text-amber-500"}
            />
          </motion.div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {PICKUP_RADIUS_KM} km
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Route distance
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
              {!hasLocation
                ? "Waiting for location"
                : typeof insight.distanceKm === "number"
                  ? `${insight.distanceKm} km`
                  : "Not available"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              ETA
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
              {typeof insight.travelMinutes === "number"
                ? `${insight.travelMinutes} min`
                : "Estimating"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Alerts
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <BellRing
                size={14}
                className={insight.canReceiveAlerts ? "text-emerald-500" : "text-gray-400"}
              />
              {insight.canReceiveAlerts ? "Ready" : "Not ready"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Nearby riders
            </p>
            <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
              {loading ? "Checking..." : insight.capacity?.nearbyOnlinePartners ?? 0}
            </p>
          </div>
        </div>

        {insight.routeSourceLabel ? (
          <p className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            {insight.routeSourceLabel}
            {typeof insight.lineDistanceKm === "number" &&
            typeof insight.distanceKm === "number" &&
            insight.lineDistanceKm !== insight.distanceKm
              ? ` • air-line ${insight.lineDistanceKm} km`
              : ""}
          </p>
        ) : null}

        {insight.capacity?.availabilityAlert ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
            {insight.capacity.availabilityAlert}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
