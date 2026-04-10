import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

async function withAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before using delivery security.");
  }

  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

async function postOrderSecurity(path, body, fallbackMessage) {
  let response;

  try {
    response = await fetch(getApiUrl(path), {
      method: "POST",
      headers: await withAuthHeaders(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Delivery security backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

export function registerOrderSecurityCode({ orderId, secretCode }) {
  return postOrderSecurity(
    "/api/order-security/register",
    { orderId, secretCode },
    "Could not register the delivery security code."
  );
}

export function verifyOrderSecurityCode({ orderId, code }) {
  return postOrderSecurity(
    "/api/order-security/verify",
    { orderId, code },
    "Could not verify the customer code."
  );
}

export function completeOrderSecurity({ orderId }) {
  return postOrderSecurity(
    "/api/order-security/complete",
    { orderId },
    "Could not close the delivery security session."
  );
}

export function revealOrderSecurityCode({ orderId }) {
  return postOrderSecurity(
    "/api/order-security/reveal",
    { orderId },
    "Could not load the secure delivery code."
  );
}
