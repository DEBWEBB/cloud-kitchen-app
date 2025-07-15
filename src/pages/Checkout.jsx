// src/pages/Checkout.jsx
import { useCart } from "../context/CartContext";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    location: null, // { lat, lng }
  });

  const [distance, setDistance] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [assignedPartner, setAssignedPartner] = useState(null);

  // Actual store coordinates for Bethuadahari
  const stores = {
    mioamore: { lat: 23.609938, lng: 88.383813 },
    monginis: { lat: 23.610062, lng: 88.384438 },
  };

// Pick one for now (later make it dynamic based on UI)
  const selectedStore = "mioamore"; // or "monginis"
  const shopLocation = stores[selectedStore];


  const toRad = (value) => (value * Math.PI) / 180;
  const getDistanceInKm = (loc1, loc2) => {
    const R = 6371;
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLng = toRad(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(loc1.lat)) *
        Math.cos(toRad(loc2.lat)) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateDeliveryCharge = (km) => {
    if (km <= 5) return 40;
    if (km <= 10) return 60;
    if (km <= 15) return 80;
    return 100;
  };

  const generateSecretCode = () =>
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const productTotal = cart.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const grandTotal = productTotal + deliveryCharge;

  // 📍 Browser GPS auto-detect
  useEffect(() => {
    if (!form.location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setForm((f) => ({ ...f, location: loc }));
          const km = getDistanceInKm(shopLocation, loc);
          setDistance(km.toFixed(2));
          setDeliveryCharge(calculateDeliveryCharge(km));
        },
        () => toast.error("❌ Unable to get location.")
      );
    }
  }, []);

  const findNearestPartner = async () => {
    const q = query(collection(db, "users"), where("role", "==", "delivery"));
    const snapshot = await getDocs(q);

    let nearest = null;
    let nearestDist = Infinity;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const partnerLoc = data.location;
      if (partnerLoc) {
        const km = getDistanceInKm(shopLocation, partnerLoc);
        if (km <= 3.5 && km < nearestDist) {
          nearest = { ...data, uid: doc.id };
          nearestDist = km;
        }
      }
    });

    return nearest;
  };

  const placeConfirmedOrder = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!form.name || !form.phone || !form.address || !form.location) {
      toast.error("Please fill all details and pin your location.");
      return;
    }

    const partner = await findNearestPartner();
    if (!partner) {
      toast.error("❌ No delivery partner available within 3.5 km!");
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
        brand: item.brand || "Unknown",
      })),
      name: form.name,
      phone: form.phone,
      address: form.address,
      location: form.location,
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
      courierName: partner.name,
      courierPhone: partner.phone || "",
    };

    const docRef = await addDoc(collection(db, "orders"), order);
    setAssignedPartner(partner);
    toast.success(`✅ Order placed! Assigned to ${partner.name}`);
    clearCart();
    navigate(`/success?orderId=${docRef.id}`);
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      alert("Please login to place order.");
      return;
    }

    if (paymentMethod === "UPI") {
      setShowUPIModal(true);
      return;
    }

    await placeConfirmedOrder();
  };

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setForm((f) => ({ ...f, location: e.latlng }));
        const km = getDistanceInKm(shopLocation, e.latlng);
        setDistance(km.toFixed(2));
        setDeliveryCharge(calculateDeliveryCharge(km));
      },
    });
    return null;
  };

  return (
    <div className="min-h-screen pt-20 p-6 bg-white dark:bg-gray-900 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">🧾 Checkout</h1>

      <input
        placeholder="Your Name"
        className="input-style mb-2"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        placeholder="Phone Number"
        className="input-style mb-2"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <textarea
        placeholder="Full Address"
        rows={3}
        className="input-style mb-2"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />

      <div className="mb-4">
        <h2 className="mb-1">📍 Pin Your Location on Map</h2>
        {form.location && (
          <MapContainer
            center={form.location}
            zoom={15}
            style={{ height: "300px", borderRadius: "10px" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={form.location} />
            <LocationPicker />
          </MapContainer>
        )}
      </div>

      {cart.length > 0 && (
        <>
          <p>🛍 Product Total: ₹{productTotal}</p>
          <p>📦 Delivery Charge: ₹{deliveryCharge} (Distance: {distance} km)</p>

          <p>
            💳 Payment:
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="ml-2 px-2 py-1 border dark:bg-gray-700"
            >
              <option value="UPI">UPI QR</option>
              <option value="COD">Cash on Delivery</option>
            </select>
          </p>

          <p className="font-bold text-green-600 text-xl mt-2">
            💰 Total: ₹{grandTotal}
          </p>

          <button
            onClick={handlePlaceOrder}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ✅ Place Order
          </button>
        </>
      )}

      {/* UPI QR Modal */}
      {showUPIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-xl max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2">Scan UPI QR</h2>
            <img
              src="./src/assets/qr.jpg"
              alt="UPI QR"
              className="mx-auto w-48 h-48"
            />
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
              After payment, click below to confirm
            </p>
            <button
              onClick={async () => {
                await placeConfirmedOrder();
                setShowUPIModal(false);
              }}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              ✅ I Have Paid
            </button>
            <button
              onClick={() => setShowUPIModal(false)}
              className="mt-2 text-sm text-red-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Add this in your index.css or tailwind global file if needed
// .input-style {
//   @apply w-full p-2 border rounded dark:bg-gray-800;
// }
