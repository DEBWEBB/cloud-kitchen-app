import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [partner, setPartner] = useState(null);
  const [secretCode, setSecretCode] = useState(null);

  useEffect(() => {
    const fetchPartnerDetails = async () => {
      try {
        if (!orderId) return;
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (orderDoc.exists()) {
          const data = orderDoc.data();

          // 🔐 Set secret code for delivery confirmation
          if (data.secretCode) {
            setSecretCode(data.secretCode);
          }

          // 🚴 Fetch partner info
          if (data.courierId) {
            const partnerDoc = await getDoc(doc(db, "users", data.courierId));
            if (partnerDoc.exists()) {
              setPartner(partnerDoc.data());
            }
          }
        }
      } catch (err) {
        console.error("Error fetching partner info:", err);
      }
    };

    fetchPartnerDetails();
  }, [orderId]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center bg-white dark:bg-gray-900 text-black dark:text-white px-4 py-10">
      <h1 className="text-3xl font-bold text-green-600 mb-3">
        ✅ Order Placed Successfully!
      </h1>
      <p className="mb-4 text-lg">Thank you for ordering with us.</p>

      {secretCode && (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 p-4 rounded-lg shadow mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-1">🔒 Delivery Confirmation Code</h2>
          <p className="text-2xl font-bold tracking-wider">{secretCode}</p>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
            Please show this code to your delivery partner when they arrive.
          </p>
        </div>
      )}

      {partner && (
        <div className="bg-green-100 dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">🚴 Assigned Delivery Partner:</h2>
          <p className="mb-1">👤 Name: <span className="font-medium">{partner.name}</span></p>
          <p className="mb-2">
            📞 Phone:{" "}
            <a href={`tel:${partner.phone || ""}`} className="text-blue-600 hover:underline">
              {partner.phone || "Not available"}
            </a>
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/orders"
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Orders
        </Link>
        <Link
          to="/"
          className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
