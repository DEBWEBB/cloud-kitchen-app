import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

async function withAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before starting online payment.");
  }

  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

export function loadRazorpayCheckoutScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existing = document.querySelector('script[data-razorpay-checkout="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function createRazorpayPaymentOrder(payload) {
  let response;

  try {
    response = await fetch(getApiUrl("/api/payments/razorpay/create-order"), {
      method: "POST",
      headers: await withAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Payment backend"));
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "Could not create payment order.");
  }

  return result;
}

export async function verifyRazorpayClientPayment(payload) {
  let response;

  try {
    response = await fetch(getApiUrl("/api/payments/razorpay/verify-client"), {
      method: "POST",
      headers: await withAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Payment backend"));
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "Payment verification failed.");
  }

  return result;
}

export async function fetchPaymentGatewayStatus(merchantOrderId) {
  if (!merchantOrderId) {
    return null;
  }

  let response;
  try {
    response = await fetch(getApiUrl(`/api/payments/status/${merchantOrderId}`), {
      headers: await withAuthHeaders(),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Payment backend"));
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "Could not load payment status.");
  }

  return result;
}
