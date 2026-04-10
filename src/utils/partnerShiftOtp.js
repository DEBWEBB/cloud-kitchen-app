import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

async function withAuthHeaders() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before managing your shift OTP.");
  }

  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

export async function sendPartnerShiftOtp({ channel, phone, email }) {
  let response;

  try {
    response = await fetch(getApiUrl("/api/partner-shift/send-otp"), {
      method: "POST",
      headers: await withAuthHeaders(),
      body: JSON.stringify({
        channel,
        phone,
        email,
      }),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Delivery backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Could not send shift OTP.");
  }

  return payload;
}

export async function verifyPartnerShiftOtp(otp) {
  let response;

  try {
    response = await fetch(getApiUrl("/api/partner-shift/verify-otp"), {
      method: "POST",
      headers: await withAuthHeaders(),
      body: JSON.stringify({ otp }),
    });
  } catch {
    throw new Error(getApiUnreachableMessage("Delivery backend"));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Partner shift verification failed.");
  }

  return payload;
}
