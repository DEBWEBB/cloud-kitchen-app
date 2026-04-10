import { auth } from "../firebase/firebaseConfig";
import { getApiUnreachableMessage, getApiUrl } from "./apiBaseUrl";

const PRESENCE_SYNC_TTL_MS = 12000;
let lastPresenceFingerprint = "";
let lastPresenceSyncedAt = 0;
let inFlightPresenceFingerprint = "";
let inFlightPresenceRequest = null;

const normalizePresenceLocation = (location) => {
  if (
    !location ||
    typeof location !== "object" ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number"
  ) {
    return null;
  }

  return {
    lat: Number(location.lat.toFixed(4)),
    lng: Number(location.lng.toFixed(4)),
  };
};

const buildPresenceFingerprint = (uid, payload) =>
  JSON.stringify({
    uid,
    isOnline: Boolean(payload.isOnline),
    location: normalizePresenceLocation(payload.location),
    name: payload.name || "",
    phone: payload.phone || "",
    isVerified: Boolean(payload.isVerified),
    currentOrderId: payload.currentOrderId || null,
  });

export const syncPartnerPresence = async ({
  isOnline,
  location,
  name,
  phone,
  isVerified,
  currentOrderId = null,
}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Please log in again before syncing partner presence.");
  }

  const requestBody = {
    isOnline: Boolean(isOnline),
    location: location || null,
    name: name || "",
    phone: phone || "",
    isVerified: Boolean(isVerified),
    currentOrderId: currentOrderId || null,
  };
  const fingerprint = buildPresenceFingerprint(currentUser.uid, requestBody);
  const now = Date.now();

  if (
    fingerprint === lastPresenceFingerprint &&
    now - lastPresenceSyncedAt < PRESENCE_SYNC_TTL_MS
  ) {
    return { ok: true, skipped: true };
  }

  if (
    inFlightPresenceRequest &&
    fingerprint === inFlightPresenceFingerprint
  ) {
    return inFlightPresenceRequest;
  }

  const requestPromise = (async () => {
    const idToken = await currentUser.getIdToken();
    let response;
    try {
      response = await fetch(getApiUrl("/api/partner-presence"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new Error(getApiUnreachableMessage("Delivery backend"));
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Failed to sync partner presence.");
    }

    lastPresenceFingerprint = fingerprint;
    lastPresenceSyncedAt = Date.now();
    return payload;
  })();

  inFlightPresenceFingerprint = fingerprint;
  inFlightPresenceRequest = requestPromise;

  try {
    return await requestPromise;
  } finally {
    if (inFlightPresenceRequest === requestPromise) {
      inFlightPresenceFingerprint = "";
      inFlightPresenceRequest = null;
    }
  }
};
