const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 🛎️ Trigger on order status update
exports.sendOrderStatusNotification = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status === after.status) return null;

    const userId = after.userId;

    const tokenDoc = await db.collection("fcmTokens").doc(userId).get();
    const token = tokenDoc.exists ? tokenDoc.data().token : null;

    if (!token) {
      console.log("❌ No FCM token for user:", userId);
      return null;
    }

    const payload = {
      notification: {
        title: `🛍 Order #${context.params.orderId.slice(0, 6)} Status`,
        body: `Your order status is now "${after.status}"`,
      },
      data: {
        orderId: context.params.orderId,
        status: after.status,
      },
    };

    try {
      const res = await admin.messaging().sendToDevice(token, payload);
      console.log("✅ Notification sent:", res);
    } catch (err) {
      console.error("❌ Error sending notification:", err);
    }

    return null;
  });
