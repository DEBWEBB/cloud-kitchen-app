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

const firebaseConfig = {
  apiKey: "AIzaSyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA",
  authDomain: "cloud-kitchen-2cfbc.firebaseapp.com",
  projectId: "cloud-kitchen-2cfbc",
  storageBucket: "cloud-kitchen-2cfbc.appspot.com",
  messagingSenderId: "1087427009836",
  appId: "1:1087427009836:web:5d298c473a50c831a5e089",
  measurementId: "G-XD3QBD2NXW",
};

const FCM_VAPID_KEY =
  "BBtxLZ_dYtQFhVHWOzF_0vSwnYlDmvu8hmAxsQu25BzHKhQuRa17_X6uRxFOmoh122STcxI2y9tGcw1pe_LPJUw";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence);

export const registerMessagingServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return null;
  }

  const swUrl = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
  return navigator.serviceWorker.register(swUrl);
};

export const requestForToken = async () => {
  try {
    const registration = await registerMessagingServiceWorker();
    if (!registration) return null;

    const currentToken = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log("FCM Token:", currentToken);
      return currentToken;
    }

    return null;
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
