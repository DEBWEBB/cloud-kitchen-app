// src/utils/saveUserFCMToken.js
import { auth, db, messaging } from "../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { getToken } from "firebase/messaging";

export const saveUserFCMToken = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await getToken(messaging, {
      vapidKey: "BBtxLZ_dYtQFhVHWOzF_0vSwnYlDmvu8hmAxsQu25BzHKhQuRa17_X6uRxFOmoh122STcxI2y9tGcw1pe_LPJUw",
    });

    if (token) {
      await setDoc(doc(db, "fcmTokens", currentUser.uid), {
        uid: currentUser.uid,
        email: currentUser.email,
        token,
        updatedAt: new Date().toISOString(),
      });
      console.log("✅ FCM token saved to Firestore");
    } else {
      console.warn("❌ No FCM token retrieved");
    }
  } catch (error) {
    console.error("Error saving FCM token:", error);
  }
};
