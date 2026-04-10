import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

export const requestPartnerAssignment = async ({ orderId, storeKey }) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before placing the order.");
  }

  const idToken = await currentUser.getIdToken();
  let response;
  try {
    response = await fetch(getApiUrl("/api/assign-partner"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        orderId,
        storeKey,
      }),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Delivery backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to assign delivery partner.");
  }

  return payload;
};
