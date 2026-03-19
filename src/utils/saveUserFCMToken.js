import { auth, db } from "../firebase/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export const saveUserFCMToken = async (token) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser || !token) return;

    await setDoc(doc(db, "fcmTokens", currentUser.uid), {
      uid: currentUser.uid,
      email: currentUser.email,
      token,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);
  }
};
