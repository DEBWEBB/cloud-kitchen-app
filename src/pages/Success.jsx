import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import CustomerDeliveryLiveCard from "../components/CustomerDeliveryLiveCard";
import usePaymentGatewayStatus from "../hooks/usePaymentGatewayStatus";
import { revealOrderSecurityCode } from "../utils/orderSecurity";

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [partner, setPartner] = useState(null);
  const [secretCode, setSecretCode] = useState(null);
  const [assignmentPending, setAssignmentPending] = useState(true);
  const [delayNotice, setDelayNotice] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [order, setOrder] = useState(null);
  const { paymentStatus } = usePaymentGatewayStatus(orderId, Boolean(orderId), 15000);

  useEffect(() => {
    if (!orderId) return undefined;

    let unsubscribePartner = () => {};

    const unsubscribeOrder = onSnapshot(
      doc(db, "orders", orderId),
      async (orderDoc) => {
        if (!orderDoc.exists()) {
          setPartner(null);
          setSecretCode(null);
          setAssignmentPending(false);
          return;
        }

        const data = orderDoc.data();
        setOrder({ id: orderDoc.id, ...data });
        setAssignmentPending(Boolean(data.assignmentPending));
        setDelayNotice(data.deliveryDelayNotice || "");
        setPaymentInfo({
          method: data.paymentMethod || "",
          status: data.paymentStatus || "",
          reference: data.paymentReference || "",
        });

        if (data.secretCode) {
          setSecretCode(data.secretCode);
        } else if (data.secretCodeProtected) {
          revealOrderSecurityCode({ orderId: orderDoc.id })
            .then((payload) => setSecretCode(payload.secretCode || null))
            .catch(() => setSecretCode(null));
        } else {
          setSecretCode(null);
        }

        if (!data.courierId) {
          setPartner(null);
          return;
        }

        unsubscribePartner();
        unsubscribePartner = onSnapshot(
          doc(db, "partners", data.courierId),
          (partnerDoc) => {
            setPartner(partnerDoc.exists() ? partnerDoc.data() : null);
          },
          (error) => {
            console.error("Success partner listener failed:", error);
            setPartner(null);
          }
        );
      },
      (error) => {
        console.error("Success order listener failed:", error);
        setOrder(null);
        setPartner(null);
        setSecretCode(null);
        setAssignmentPending(false);
      }
    );

    return () => {
      unsubscribeOrder();
      unsubscribePartner();
    };
  }, [orderId]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center bg-white dark:bg-gray-900 text-black dark:text-white px-4 py-10">
      <h1 className="text-3xl font-bold text-green-600 mb-3">
        Order Placed Successfully
      </h1>
      <p className="mb-4 text-lg">Thank you for ordering with us.</p>

      {secretCode && (
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 p-4 rounded-lg shadow mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-1">Delivery Confirmation Code</h2>
          <p className="text-2xl font-bold tracking-wider">{secretCode}</p>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
            Please show this code to your delivery partner when they arrive.
          </p>
        </div>
      )}

      {assignmentPending && (
        <div className="bg-blue-100 dark:bg-blue-950/40 p-4 rounded-lg shadow-md mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">Finding delivery partner</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            We are assigning the nearest verified partner to your order now.
          </p>
        </div>
      )}

      {delayNotice && (
        <div className="bg-amber-100 dark:bg-amber-950/40 p-4 rounded-lg shadow-md mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">Delivery timing update</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">{delayNotice}</p>
        </div>
      )}

      {paymentInfo?.method && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">Payment record</h2>
          <p className="mb-1">
            Method: <span className="font-medium">{paymentInfo.method}</span>
          </p>
          <p className="mb-1">
            Status: <span className="font-medium">{paymentInfo.status || "Pending"}</span>
          </p>
          <p>
            Reference: <span className="font-medium">{paymentInfo.reference || "Not recorded"}</span>
          </p>
        </div>
      )}

      {order ? (
        <div className="mb-6 w-full max-w-md">
          <CustomerDeliveryLiveCard
            order={order}
            compact
            paymentStatus={paymentStatus}
          />
        </div>
      ) : null}

      {partner && (
        <div className="bg-green-100 dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-2">Assigned Delivery Partner</h2>
          <p className="mb-1">
            Name: <span className="font-medium">{partner.name}</span>
          </p>
          <p className="mb-2">
            Phone:{" "}
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
