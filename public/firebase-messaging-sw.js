importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "***REMOVED***SyCqNo_01sglnl5Fh5atIaOYa--rWTCAyYA",
  authDomain: "cloud-kitchen-2cfbc.firebaseapp.com",
  projectId: "cloud-kitchen-2cfbc",
  storageBucket: "cloud-kitchen-2cfbc.appspot.com",
  messagingSenderId: "1087427009836",
  appId: "1:1087427009836:web:5d298c473a50c831a5e089",
  measurementId: "G-XD3QBD2NXW",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
