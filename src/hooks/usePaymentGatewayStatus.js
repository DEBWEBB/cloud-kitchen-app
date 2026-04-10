import { useEffect, useState } from "react";
import { fetchPaymentGatewayStatus } from "../utils/paymentGateway";

export default function usePaymentGatewayStatus(
  orderId,
  enabled = true,
  pollMs = 30000
) {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState(false);

  useEffect(() => {
    if (!orderId || !enabled) {
      setPaymentStatus(null);
      return undefined;
    }

    let isMounted = true;

    const loadStatus = async () => {
      try {
        setLoadingPaymentStatus(true);
        const payload = await fetchPaymentGatewayStatus(orderId);
        if (isMounted) {
          setPaymentStatus(payload);
        }
      } catch {
        if (isMounted) {
          setPaymentStatus(null);
        }
      } finally {
        if (isMounted) {
          setLoadingPaymentStatus(false);
        }
      }
    };
    loadStatus();
    const intervalId =
      pollMs > 0 ? window.setInterval(loadStatus, pollMs) : null;

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, orderId, pollMs]);

  return { paymentStatus, loadingPaymentStatus };
}
