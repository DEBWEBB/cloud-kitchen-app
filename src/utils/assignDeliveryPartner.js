import {
  collection,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import haversine from "./haversineDistance";

const STORE_LOCATIONS = {
  mio: { lat: 23.609938, lng: 88.383813, label: "Mio Amore - Bethuadahari" },
  monginis: { lat: 23.610062, lng: 88.384438, label: "Monginis" },
};

export const getStoreLocation = (storeKey) =>
  STORE_LOCATIONS[storeKey] || STORE_LOCATIONS.mio;

export const findNearestDeliveryPartner = async (
  storeKey,
  excludePartnerIds = []
) => {
  const storeLocation = getStoreLocation(storeKey);
  const snapshot = await getDocs(collection(db, "partners"));

  let nearest = null;
  let nearestDistance = Infinity;

  snapshot.forEach((partnerDoc) => {
    const partner = partnerDoc.data();
    const partnerLocation = partner.location || partner.lastKnownLocation;

    if (
      !partner?.isOnline ||
      !partner?.isVerified ||
      !partnerLocation ||
      partner.currentOrderId ||
      excludePartnerIds.includes(partnerDoc.id)
    ) {
      return;
    }

    const distanceKm = haversine(storeLocation, partnerLocation);
    if (distanceKm < nearestDistance) {
      nearest = {
        uid: partnerDoc.id,
        ...partner,
        distanceKm: Number(distanceKm.toFixed(2)),
      };
      nearestDistance = distanceKm;
    }
  });

  return nearest;
};

export const reservePartnerForOrder = async (partnerId, orderId) => {
  await updateDoc(doc(db, "partners", partnerId), {
    currentOrderId: orderId,
    lastAssignedAt: serverTimestamp(),
  });
};

export const releasePartnerForOrder = async (
  partnerId,
  { delivered = false, earningsDelta = 0 } = {}
) => {
  const updates = {
    currentOrderId: null,
    lastCompletedAt: delivered ? serverTimestamp() : null,
  };

  if (delivered) {
    updates.deliveriesCompleted = increment(1);
    updates.earnings = increment(earningsDelta);
  }

  await updateDoc(doc(db, "partners", partnerId), updates);
};

export const reassignOrderToNextPartner = async ({
  orderId,
  storeKey,
  rejectedPartnerId,
}) => {
  if (rejectedPartnerId) {
    await updateDoc(doc(db, "partners", rejectedPartnerId), {
      currentOrderId: null,
      lastRejectedAt: serverTimestamp(),
    });
  }

  const nextPartner = await findNearestDeliveryPartner(
    storeKey,
    rejectedPartnerId ? [rejectedPartnerId] : []
  );
  if (!nextPartner) return null;

  await reservePartnerForOrder(nextPartner.uid, orderId);
  await updateDoc(doc(db, "orders", orderId), {
    courierId: nextPartner.uid,
    courierName: nextPartner.name || "Delivery Partner",
    courierPhone: nextPartner.phone || "",
    partnerVerified: Boolean(nextPartner.isVerified),
    partnerDistanceKm: nextPartner.distanceKm,
    reassignedAt: serverTimestamp(),
    rejectedPartnerId: rejectedPartnerId || null,
  });

  return nextPartner;
};
