/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// ✅ Initialize Firebase App
firebase.initializeApp({
  apiKey: "AIzaSyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA",
  authDomain: "cloud-kitchen-2cfbc.firebaseapp.com",
  projectId: "cloud-kitchen-2cfbc",
  storageBucket: "cloud-kitchen-2cfbc.appspot.com",
  messagingSenderId: "1087427009836",
  appId: "1:1087427009836:web:5d298c473a50c831a5e089",
  measurementId: "G-XD3QBD2NXW",
});

// ✅ Messaging Instance
const messaging = firebase.messaging();

// ✅ Background Message Handler
messaging.onBackgroundMessage(function (payload) {
  console.log("[firebase-messaging-sw.js] 🎯 Background message received:", payload);

  const notificationTitle = payload.notification?.title || "Cloud Kitchen 🍽️";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new update!",
    icon: "/logo192.png", // ✅ Add your brand/logo here (ensure logo192.png exists in /public)
    vibrate: [200, 100, 200], // Optional: subtle buzz pattern
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
