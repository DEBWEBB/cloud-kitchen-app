import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import haversine from "./haversineDistance";

// 🏬 Hardcoded store locations
const STORES = {
  mioamore: { lat: 23.609938, lng: 88.383813 },
  monginis: { lat: 23.610062, lng: 88.384438 },
};

// 🔁 Broadcast new delivery request to nearby partners
export const assignDeliveryPartner = async (orderId, storeKey) => {
  const storeLocation = STORES[storeKey];
  if (!storeLocation) {
    console.error("❌ Invalid store key");
    return;
  }

  const partnersQuery = query(collection(db, "users"), where("role", "==", "delivery"));
  const snapshot = await getDocs(partnersQuery);

  const nearbyPartners = [];
  const allOnlinePartners = [];

  snapshot.forEach((docSnap) => {
    const partner = docSnap.data();
    if (!partner?.online || !partner?.lastKnownLocation) return;

    const distance = haversine(storeLocation, partner.lastKnownLocation);
    const partnerData = {
      id: docSnap.id,
      name: partner.name,
      distance,
    };

    if (distance <= 2.5) nearbyPartners.push(partnerData);
    if (distance <= 3.5) allOnlinePartners.push(partnerData);
  });

  // 🔔 Step 1: Broadcast to nearby partners within 2.5 km
  if (nearbyPartners.length === 0) {
    console.warn("🚫 No online delivery partners within 2.5 km.");
  }

  const broadcast = async (partnerList, reason = "initial") => {
    const promises = partnerList.map((p) => {
      const reqRef = doc(db, "orderRequests", `${orderId}_${p.id}`);
      return setDoc(reqRef, {
        orderId,
        partnerId: p.id,
        distance: p.distance,
        storeKey,
        reason,
        timestamp: serverTimestamp(),
        status: "pending",
      });
    });
    await Promise.all(promises);
    console.log(`📡 Broadcasted to ${partnerList.length} partner(s) (${reason})`);
  };

  await broadcast(nearbyPartners, "initial");

  // 🕒 Step 2: After 2 minutes, re-broadcast if no one accepted
  setTimeout(async () => {
    const requestsSnapshot = await getDocs(
      query(collection(db, "orderRequests"), where("orderId", "==", orderId))
    );

    const stillPending = requestsSnapshot.docs.every(
      (d) => d.data().status === "pending"
    );

    if (stillPending && allOnlinePartners.length > 0) {
      console.log("⏱ No response in 2 min, rebroadcasting to all online partners within 3.5km");
      await broadcast(allOnlinePartners, "rebroadcast");
    } else {
      console.log("✅ Order accepted by some partner already or no partners online");
    }
  }, 120000); // 2 minutes in milliseconds
};
