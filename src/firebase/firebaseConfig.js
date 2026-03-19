// src/firebase/firebaseConfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getStorage } from "firebase/storage";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA",
  authDomain: "cloud-kitchen-2cfbc.firebaseapp.com",
  projectId: "cloud-kitchen-2cfbc",
  storageBucket: "cloud-kitchen-2cfbc.appspot.com",
  messagingSenderId: "1087427009836",
  appId: "1:1087427009836:web:5d298c473a50c831a5e089",
  measurementId: "G-XD3QBD2NXW",
};

// ✅ Only initialize once 
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);

// ✅ Set local persistence
setPersistence(auth, browserLocalPersistence);

// 🔔 Notification Functions
export const requestForToken = async () => {
  try {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service workers not supported");
      return null;
    }

    // ✅ STEP 1: Register service worker manually
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    // ✅ STEP 2: Get token with SW
    const currentToken = await getToken(messaging, {
      vapidKey:
        "BBtxLZ_dYtQFhVHWOzF_0vSwnYlDmvu8hmAxsQu25BzHKhQuRa17_X6uRxFOmoh122STcxI2y9tGcw1pe_LPJUw",
      serviceWorkerRegistration: registration, // 🔥 IMPORTANT
    });

    if (currentToken) {
      console.log("✅ FCM Token:", currentToken);
      return currentToken;
    } else {
      console.warn("❌ No registration token available.");
      return null;
    }
  } catch (error) {
    console.error("❌ Error retrieving token:", error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
