import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase/firebaseConfig";
import {
  findNearestDeliveryPartner,
  reservePartnerForOrder,
  getStoreLocation,
} from "../utils/assignDeliveryPartner";
import qrImage from "../assets/qr.jpg";
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
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [showUPIModal, setShowUPIModal] = useState(false);
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

  const updateLocation = (location) => {
    setForm((current) => ({ ...current, location }));
    const km = getDistanceInKm(selectedStore, location);
    setDistance(Number(km.toFixed(2)));
    setDeliveryCharge(calculateDeliveryCharge(km));
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

  const placeConfirmedOrder = async () => {
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

    const partner = await findNearestDeliveryPartner(selectedStoreKey);
    if (!partner) {
      toast.error("No verified online delivery partner is available right now.");
      return;
    }

    const partnerShare = Math.round(deliveryCharge * 0.9);
    const ownerShare = deliveryCharge - partnerShare;
    const order = {
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
      deliveryCharge,
      partnerShare,
      ownerShare,
      distanceKm: distance,
      total: grandTotal,
      paymentMethod,
      status: "pending",
      createdAt: serverTimestamp(),
      secretCode: generateSecretCode(),
      courierId: partner.uid,
      courierName: partner.name || "Delivery Partner",
      courierPhone: partner.phone || "",
      partnerVerified: Boolean(partner.isVerified),
      partnerDistanceKm: partner.distanceKm || null,
    };

    const docRef = await addDoc(collection(db, "orders"), order);
    await reservePartnerForOrder(partner.uid, docRef.id);
    setOrderPlaced(true);
    toast.success(`Order placed. Assigned to ${order.courierName}.`);
    clearCart();
    navigate(`/success?orderId=${docRef.id}`);
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to place your order.");
      navigate("/login");
      return;
    }

    if (paymentMethod === "UPI") {
      setShowUPIModal(true);
      return;
    }

    await placeConfirmedOrder();
  };

  return (
    <div className="min-h-screen bg-white px-6 pb-10 pt-20 text-black dark:bg-gray-900 dark:text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold">Checkout</h1>
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
                style={{ height: "320px", borderRadius: "18px" }}
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
            </div>

            <label className="mb-2 block text-sm font-medium">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className={inputClassName}
            >
              <option value="UPI">UPI QR</option>
              <option value="COD">Cash on Delivery</option>
            </select>

            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
              <span className="text-base font-semibold">Total</span>
              <span className="text-2xl font-bold text-green-600">Rs.{grandTotal}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-semibold text-white transition hover:from-pink-600 hover:to-orange-500"
            >
              Place Order
            </button>
          </aside>
        </div>
      </div>

      {showUPIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl dark:bg-gray-800">
            <h2 className="mb-2 text-xl font-bold">Scan UPI QR</h2>
            <img src={qrImage} alt="UPI QR" className="mx-auto h-48 w-48 rounded-2xl" />
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Complete the payment, then confirm below to place the order.
            </p>
            <button
              onClick={async () => {
                const placed = await placeConfirmedOrder();
                if (placed) {
                  setShowUPIModal(false);
                }
              }}
              className="mt-5 w-full rounded-2xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              I Have Paid
            </button>
            <button
              onClick={() => setShowUPIModal(false)}
              className="mt-3 text-sm text-red-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
