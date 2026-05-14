import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase/firebaseConfig";
import { getStoreLocation } from "../utils/assignDeliveryPartner";
import { requestPartnerAssignment } from "../utils/requestPartnerAssignment";
import { requestRouteMetrics } from "../utils/requestRouteMetrics";
import {
  createRazorpayPaymentOrder,
  loadRazorpayCheckoutScript,
  verifyRazorpayClientPayment,
} from "../utils/paymentGateway";
import { registerOrderSecurityCode } from "../utils/orderSecurity";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const inputClassName =
  "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const toRad = (value) => (value * Math.PI) / 180;

const getDistanceInKm = (loc1, loc2) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const calculateDeliveryCharge = (km) => {
  if (km <= 5) return 40;
  if (km <= 10) return 60;
  if (km <= 15) return 80;
  return 100;
};

const generateSecretCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

function LocationPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  return null;
}

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    location: null,
  });
  const [distance, setDistance] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [distanceSourceLabel, setDistanceSourceLabel] = useState("Straight-line fallback");
  const [estimatedTravelMinutes, setEstimatedTravelMinutes] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const hasItems = cart.length > 0;
  const selectedStoreKey = cart[0]?.shop === "monginis" ? "monginis" : "mio";
  const selectedStore = getStoreLocation(selectedStoreKey);
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const productTotal = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const grandTotal = productTotal + deliveryCharge;

  const updateLocation = async (location) => {
    setForm((current) => ({ ...current, location }));
    const fallbackKm = Number(getDistanceInKm(selectedStore, location).toFixed(2));
    setDistance(fallbackKm);
    setDeliveryCharge(calculateDeliveryCharge(fallbackKm));
    setDistanceSourceLabel("Straight-line fallback");
    setEstimatedTravelMinutes(null);

    const metrics = await requestRouteMetrics({
      from: selectedStore,
      to: location,
    });

    if (typeof metrics?.distanceKm === "number") {
      setDistance(metrics.distanceKm);
      setDeliveryCharge(calculateDeliveryCharge(metrics.distanceKm));
    }

    setDistanceSourceLabel(metrics?.sourceLabel || "Straight-line fallback");
    setEstimatedTravelMinutes(metrics?.travelMinutes ?? null);
  };

  const buildOrderBase = ({
    user,
    orderId,
    distanceKm,
    deliveryFee,
    routeEtaMinutes,
    routeSourceLabel,
    routeSource,
  }) => {
    const partnerShare = Math.round(deliveryFee * 0.9);
    const ownerShare = deliveryFee - partnerShare;

    return {
      id: orderId,
      userId: user.uid,
      items: cart.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        brand: item.brand || item.shop || "Unknown",
        shop: item.shop || selectedStoreKey,
      })),
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      location: form.location,
      store: selectedStoreKey,
      storeName: selectedStore.label,
      productTotal,
      deliveryCharge: deliveryFee,
      partnerShare,
      ownerShare,
      distanceKm,
      routeEtaMinutes: routeEtaMinutes || null,
      distanceSourceLabel: routeSourceLabel || "Straight-line fallback",
      distanceSource: routeSource || "haversine-fallback",
      total: productTotal + deliveryFee,
      secretCodeProtected: true,
    };
  };

  useEffect(() => {
    if (!hasItems && !orderPlaced) {
      navigate("/cart");
    }
  }, [hasItems, navigate, orderPlaced]);

  useEffect(() => {
    if (!hasItems || form.location || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        toast.error("Unable to get location. Pin it manually on the map.");
      }
    );
  }, [form.location, hasItems, selectedStore]);

  const placeConfirmedOrder = async ({
    predefinedOrderId = "",
    paymentContext = {},
    draftSecretCode = "",
  } = {}) => {
    const user = auth.currentUser;

    if (!user) {
      toast.error("Please login to place your order.");
      navigate("/login");
      return;
    }

    if (!hasItems) {
      toast.error("Your cart is empty.");
      navigate("/cart");
      return;
    }

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.location) {
      toast.error("Please complete your details and pin your location.");
      return;
    }

    const orderRef = predefinedOrderId
      ? doc(db, "orders", predefinedOrderId)
      : doc(collection(db, "orders"));
    const currentSecretCode = draftSecretCode || generateSecretCode();
    const deliveryMetrics = await requestRouteMetrics({
      from: selectedStore,
      to: form.location,
    });
    const finalDistanceKm =
      deliveryMetrics?.distanceKm ||
      Number(getDistanceInKm(selectedStore, form.location).toFixed(2));
    const finalDeliveryCharge = calculateDeliveryCharge(finalDistanceKm);

    setDistance(finalDistanceKm);
    setDeliveryCharge(finalDeliveryCharge);
    setDistanceSourceLabel(
      deliveryMetrics?.sourceLabel || "Straight-line fallback"
    );
    setEstimatedTravelMinutes(deliveryMetrics?.travelMinutes ?? null);

    const orderBase = buildOrderBase({
      user,
      orderId: orderRef.id,
      distanceKm: finalDistanceKm,
      deliveryFee: finalDeliveryCharge,
      routeEtaMinutes: deliveryMetrics?.travelMinutes ?? null,
      routeSourceLabel:
        deliveryMetrics?.sourceLabel || "Straight-line fallback",
      routeSource: deliveryMetrics?.source || "haversine-fallback",
    });
    let assignment = {
      assignmentPending: true,
      partner: null,
    };

    try {
      assignment = await requestPartnerAssignment({
        orderId: orderRef.id,
        storeKey: selectedStoreKey,
      });

      if (assignment?.availabilityAlert) {
        toast.error(assignment.availabilityAlert);
      }
    } catch (error) {
      console.error("Partner assignment request failed:", error);
      toast.error("Could not check partner availability. Order will remain pending assignment.");
    }

    const assignedPartner = assignment.partner;
    const order = {
      ...orderBase,
      paymentMethod,
      paymentProvider:
        paymentMethod === "ONLINE" ? "Razorpay" : "cash",
      paymentReference: paymentContext.gatewayPaymentId || "",
      paymentStatus:
        paymentMethod === "ONLINE"
          ? paymentContext.paymentStatus || "verification_pending"
          : "pending_cod",
      paymentRecordedAt:
        paymentMethod === "ONLINE"
          ? paymentContext.verifiedAt || new Date().toISOString()
          : null,
      paymentAudit: [
        {
          method: paymentMethod,
          provider: paymentMethod === "ONLINE" ? "Razorpay" : "cash",
          reference: paymentContext.gatewayPaymentId || "",
          gatewayOrderId: paymentContext.gatewayOrderId || "",
          gatewayPaymentId: paymentContext.gatewayPaymentId || "",
          status:
            paymentMethod === "ONLINE"
              ? paymentContext.paymentStatus || "verification_pending"
              : "pending_cod",
          recordedAt:
            paymentMethod === "ONLINE"
              ? paymentContext.verifiedAt || new Date().toISOString()
              : new Date().toISOString(),
        },
      ],
      paymentGateway: paymentMethod === "ONLINE" ? "razorpay" : "",
      paymentGatewayOrderId: paymentContext.gatewayOrderId || "",
      paymentGatewayPaymentId: paymentContext.gatewayPaymentId || "",
      status: "pending",
      confirmedAt: serverTimestamp(),
      lastUpdatedAt: serverTimestamp(),
      courierId: assignedPartner?.uid || null,
      courierName: assignedPartner?.name || "",
      courierPhone: assignedPartner?.phone || "",
      partnerVerified: Boolean(assignedPartner?.isVerified),
      partnerDistanceKm: assignedPartner?.distanceKm || null,
      partnerTravelMinutes: assignedPartner?.travelMinutes || null,
      partnerDistanceSource: assignedPartner?.distanceSource || "",
      partnerLineDistanceKm: assignedPartner?.lineDistanceKm || null,
      assignmentPending: assignment.assignmentPending ?? !assignedPartner,
      nearbyPartnerCount: assignment?.nearbyOnlinePartners ?? 0,
      deliveryDelayNotice: assignment?.availabilityAlert || "",
    };

    try {
      if (predefinedOrderId) {
        await setDoc(orderRef, order, { merge: true });
      } else {
        await setDoc(orderRef, {
          ...order,
          createdAt: serverTimestamp(),
        });
      }

      try {
        await registerOrderSecurityCode({
          orderId: orderRef.id,
          secretCode: currentSecretCode,
        });
      } catch (securityError) {
        console.error("Order security registration failed:", securityError);
        toast.error(
          "Order placed, but secure delivery-code verification is not ready yet. Restart the backend before delivery confirmation."
        );
      }

      setOrderPlaced(true);
      toast.success(
        assignedPartner
          ? `Order placed. ${assignedPartner.name || "Delivery partner"} has been assigned.`
          : "Order placed. Looking for the nearest delivery partner."
      );
      clearCart();
      navigate(`/success?orderId=${orderRef.id}`);
      return true;
    } catch (error) {
      console.error("Order placement failed:", error);
      toast.error(
        predefinedOrderId
          ? "Payment was captured, but final order sync failed. The order draft is saved for recovery."
          : "Order could not be placed. Please try again."
      );
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to place your order.");
      navigate("/login");
      return;
    }

    if (paymentMethod === "ONLINE") {
      if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.location) {
        toast.error("Please complete your details and pin your location.");
        return;
      }

      let draftCreated = false;
      let paymentSettled = false;
      let draftOrderRef = null;

      try {
        setGatewayBusy(true);
        const gatewayReady = await loadRazorpayCheckoutScript();
        if (!gatewayReady || !window.Razorpay) {
          throw new Error("Could not load the Razorpay checkout.");
        }

        const draftOrderId = doc(collection(db, "orders")).id;
        const draftSecretCode = generateSecretCode();
        const paymentOrder = await createRazorpayPaymentOrder({
          merchantOrderId: draftOrderId,
          amount: grandTotal,
          currency: "INR",
          receipt: `HB-${draftOrderId.slice(-10).toUpperCase()}`,
          customer: {
            name: form.name.trim(),
            email: auth.currentUser.email || "",
            phone: form.phone.trim(),
          },
        });
        draftOrderRef = doc(db, "orders", draftOrderId);
        await setDoc(draftOrderRef, {
          ...buildOrderBase({
            user: auth.currentUser,
            orderId: draftOrderId,
          }),
          paymentMethod: "ONLINE",
          paymentProvider: "Razorpay",
          paymentReference: "",
          paymentStatus: "gateway_order_created",
          paymentRecordedAt: new Date().toISOString(),
          paymentAudit: [
            {
              method: "ONLINE",
              provider: "Razorpay",
              reference: "",
              gatewayOrderId: paymentOrder.gatewayOrderId,
              gatewayPaymentId: "",
              status: "gateway_order_created",
              recordedAt: new Date().toISOString(),
            },
          ],
          paymentGateway: "razorpay",
          paymentGatewayOrderId: paymentOrder.gatewayOrderId,
          paymentGatewayPaymentId: "",
          status: "payment_initiated",
          assignmentPending: true,
          nearbyPartnerCount: 0,
          deliveryDelayNotice: "",
          courierId: null,
          courierName: "",
          courierPhone: "",
          partnerVerified: false,
          partnerDistanceKm: null,
          createdAt: serverTimestamp(),
          lastUpdatedAt: serverTimestamp(),
        });
        draftCreated = true;

        const paymentResponse = await new Promise((resolve, reject) => {
          const checkout = new window.Razorpay({
            key: paymentOrder.keyId,
            amount: paymentOrder.amountPaise,
            currency: paymentOrder.currency,
            name: "HungryBox",
            description: `${selectedStore.label} online order`,
            order_id: paymentOrder.gatewayOrderId,
            prefill: {
              name: form.name.trim(),
              email: auth.currentUser.email || "",
              contact: form.phone.trim(),
            },
            notes: {
              merchantOrderId: draftOrderId,
              store: selectedStore.label,
            },
            theme: {
              color: "#f43f5e",
            },
            handler: (response) => resolve(response),
            modal: {
              ondismiss: () => reject(new Error("Payment cancelled.")),
            },
          });

          checkout.on("payment.failed", (response) => {
            reject(
              new Error(
                response?.error?.description || "Online payment failed."
              )
            );
          });

          checkout.open();
        });

        const verifiedPayment = await verifyRazorpayClientPayment({
          merchantOrderId: draftOrderId,
          ...paymentResponse,
        });
        paymentSettled = true;

        await placeConfirmedOrder({
          predefinedOrderId: draftOrderId,
          draftSecretCode,
          paymentContext: {
            gatewayOrderId: verifiedPayment.gatewayOrderId,
            gatewayPaymentId: verifiedPayment.gatewayPaymentId,
            paymentStatus: verifiedPayment.status,
            verifiedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        if (draftCreated && !paymentSettled && draftOrderRef) {
          try {
            await deleteDoc(draftOrderRef);
          } catch (cleanupError) {
            console.error("Draft order cleanup failed:", cleanupError);
          }
        }
        toast.error(error.message || "Could not complete online payment.");
      } finally {
        setGatewayBusy(false);
      }
      return;
    }

    await placeConfirmedOrder();
  };

  return (
    <div className="min-h-screen bg-white px-4 pb-32 pt-20 text-black dark:bg-gray-900 dark:text-white sm:px-6 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Checkout</h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          Review your delivery details, confirm your map pin, and place your order.
        </p>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-gray-200 bg-gray-50/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/40">
            <h2 className="mb-4 text-lg font-semibold">Delivery Details</h2>

            <div className="grid gap-3">
              <input
                placeholder="Your Name"
                className={inputClassName}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                placeholder="Phone Number"
                className={inputClassName}
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
              <textarea
                placeholder="Full Address"
                rows={3}
                className={inputClassName}
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h3 className="font-medium">Pin Your Location</h3>
                <span className="text-right text-xs text-gray-500 dark:text-gray-400">
                  Tap the map to adjust your delivery point
                </span>
              </div>

              <MapContainer
                key={`${form.location?.lat || selectedStore.lat}-${form.location?.lng || selectedStore.lng}`}
                center={form.location || selectedStore}
                zoom={15}
                style={{ height: "300px", borderRadius: "18px" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={form.location || selectedStore} />
                <LocationPicker onPick={updateLocation} />
              </MapContainer>
            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-800/50">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Order Summary</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {item.quantity || 1} x Rs.{item.price}
                    </p>
                  </div>
                  <p className="font-semibold">Rs.{item.price * (item.quantity || 1)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Store</span>
                <span className="font-medium">{selectedStore.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Products</span>
                <span>Rs.{productTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Delivery</span>
                <span>Rs.{deliveryCharge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Distance</span>
                <span>{distance || 0} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Distance basis</span>
                <span>{distanceSourceLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">ETA</span>
                <span>
                  {typeof estimatedTravelMinutes === "number"
                    ? `${estimatedTravelMinutes} min`
                    : "Updating"}
                </span>
              </div>
            </div>

            <label className="mb-2 block text-sm font-medium">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClassName}
            >
              <option value="ONLINE">Online Payment (UPI / Cards / Netbanking)</option>
              <option value="COD">Cash on Delivery</option>
            </select>
            {paymentMethod === "ONLINE" ? (
              <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-pink-700 dark:border-pink-900/30 dark:bg-pink-950/20 dark:text-pink-200">
                Pay securely through Razorpay. The final order record will store the gateway payment ID and verification status.
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
              <span className="text-base font-semibold">Total</span>
              <span className="text-2xl font-bold text-green-600">Rs.{grandTotal}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={gatewayBusy}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-semibold text-white transition hover:from-pink-600 hover:to-orange-500"
            >
              {gatewayBusy ? "Processing payment..." : "Place Order"}
            </button>
          </aside>
        </div>
        {hasItems ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-14px_35px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 md:hidden">
            <div className="mx-auto flex max-w-5xl items-center gap-3">
              <div className="min-w-0 flex-1 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Final total
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  Rs.{grandTotal}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {itemCount} item{itemCount === 1 ? "" : "s"} - {distanceSourceLabel}
                </p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={gatewayBusy}
                className="shrink-0 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(244,114,182,0.25)] transition hover:from-pink-600 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {gatewayBusy ? "Processing..." : "Place Order"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
