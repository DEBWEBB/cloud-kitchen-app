const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const CLAIM_RADIUS_KM = 3;

const STORE_LOCATIONS = {
  mio: {lat: 23.609938, lng: 88.383813, label: "Mio Amore"},
  monginis: {lat: 23.610062, lng: 88.384438, label: "Monginis"},
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversine(coord1, coord2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getStoreLocation(storeKey) {
  return STORE_LOCATIONS[storeKey] || STORE_LOCATIONS.mio;
}

async function sendNotificationToUser(uid, payload) {
  const tokenDoc = await db.collection("fcmTokens").doc(uid).get();
  const token = tokenDoc.exists ? tokenDoc.data().token : null;

  if (!token) {
    console.log("No FCM token for user:", uid);
    return null;
  }

  try {
    const response = await admin.messaging().sendToDevice(token, payload);
    console.log("Notification sent:", uid, response);
    return response;
  } catch (error) {
    console.error("Error sending notification:", uid, error);
    return null;
  }
}

exports.assignNearbyPartnerOnOrderCreate = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();
    if (!order) return null;

    const storeLocation = getStoreLocation(order.store);
    const partnersSnapshot = await db.collection("partners").get();

    let selectedPartner = null;
    let nearestDistance = Infinity;

    partnersSnapshot.forEach((partnerDoc) => {
      const partner = partnerDoc.data();
      const partnerLocation = partner.location || partner.lastKnownLocation;

      if (
        !partner ||
        !partner.isOnline ||
        !partner.isVerified ||
        !partnerLocation ||
        partner.currentOrderId
      ) {
        return;
      }

      const distanceKm = haversine(storeLocation, partnerLocation);
      if (distanceKm <= CLAIM_RADIUS_KM && distanceKm < nearestDistance) {
        selectedPartner = {
          id: partnerDoc.id,
          ...partner,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
        nearestDistance = distanceKm;
      }
    });

    if (!selectedPartner) {
      await snapshot.ref.set({
        assignmentPending: true,
        assignmentNote: `No verified online partner found within ${CLAIM_RADIUS_KM} km.`,
        assignmentCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      return null;
    }

    const partnerRef = db.collection("partners").doc(selectedPartner.id);

    await db.runTransaction(async (transaction) => {
      const freshPartner = await transaction.get(partnerRef);
      if (!freshPartner.exists) {
        throw new Error("Selected partner no longer exists.");
      }

      const partnerData = freshPartner.data();
      if (partnerData.currentOrderId) {
        throw new Error("Selected partner is already reserved.");
      }

      transaction.update(snapshot.ref, {
        courierId: selectedPartner.id,
        courierName: selectedPartner.name || "Delivery Partner",
        courierPhone: selectedPartner.phone || "",
        partnerVerified: Boolean(selectedPartner.isVerified),
        partnerDistanceKm: selectedPartner.distanceKm,
        assignmentPending: false,
        assignmentSource: "cloud-function",
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(partnerRef, {
        currentOrderId: context.params.orderId,
        lastAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await sendNotificationToUser(selectedPartner.id, {
      notification: {
        title: "New delivery assigned",
        body: `Order #${context.params.orderId.slice(0, 6)} is ready for pickup.`,
      },
      data: {
        orderId: context.params.orderId,
        type: "partner_assignment",
      },
    });

    return null;
  });

exports.sendOrderStatusNotification = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status && before.courierId === after.courierId) {
      return null;
    }

    if (before.courierId !== after.courierId && after.courierId) {
      await sendNotificationToUser(after.userId, {
        notification: {
          title: "Delivery partner assigned",
          body: `${after.courierName || "A delivery partner"} is on your order.`,
        },
        data: {
          orderId: context.params.orderId,
          courierId: after.courierId,
          type: "partner_assigned",
        },
      });
    }

    if (before.status === after.status) {
      return null;
    }

    await sendNotificationToUser(after.userId, {
      notification: {
        title: `Order #${context.params.orderId.slice(0, 6)} Status`,
        body: `Your order status is now "${after.status}"`,
      },
      data: {
        orderId: context.params.orderId,
        status: after.status,
        type: "order_status",
      },
    });

    return null;
  });
