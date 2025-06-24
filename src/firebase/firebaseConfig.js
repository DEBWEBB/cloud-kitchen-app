import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase Config
const firebaseConfig = {
  apiKey: "***REMOVED***SyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA",
  authDomain: "cloud-kitchen-2cfbc.firebaseapp.com",
  projectId: "cloud-kitchen-2cfbc",
  storageBucket: "cloud-kitchen-2cfbc.appspot.com",
  messagingSenderId: "1087427009836",
  appId: "1:1087427009836:web:5d298c473a50c831a5e089",
  measurementId: "G-XD3QBD2NXW",
};

// ✅ Only initialize once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);

// Notification Functions
export const requestForToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: "BBtxLZ_dYtQFhVHWOzF_0vSwnYlDmvu8hmAxsQu25BzHKhQuRa17_X6uRxFOmoh122STcxI2y9tGcw1pe_LPJUw",
    });

    if (currentToken) {
      console.log("FCM Token:", currentToken);
    } else {
      console.warn("No registration token available.");
    }
  } catch (error) {
    console.error("Error retrieving token: ", error);
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
