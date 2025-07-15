// src/utils/useLocationUpdater.js (UPDATE THIS FILE)
import { useEffect, useState, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { getAuth } from "firebase/auth";

const useLocationUpdater = () => {
  const [location, setLocation] = useState(null);
  const watcherId = useRef(null);
  const auth = getAuth();

  const startUpdating = (orderId) => {
    if (!("geolocation" in navigator)) return;

    watcherId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = { lat: latitude, lng: longitude };
        setLocation(loc);

        const userId = auth.currentUser?.uid;
        if (userId) {
          await updateDoc(doc(db, "users", userId), {
            lastKnownLocation: loc,
          });
        }

        if (orderId) {
          await updateDoc(doc(db, "orders", orderId), {
            location: loc,
          });
        }
      },
      (err) => console.warn("Geo Error:", err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  };

  const stopUpdating = () => {
    if (watcherId.current !== null) {
      navigator.geolocation.clearWatch(watcherId.current);
      watcherId.current = null;
    }
  };

  useEffect(() => stopUpdating, []);

  return { location, startUpdating, stopUpdating };
};

export default useLocationUpdater;
