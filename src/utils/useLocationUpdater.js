import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase/firebaseConfig";

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
};

export default function useLocationUpdater() {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const watcherId = useRef(null);
  const auth = getAuth();

  const stopUpdating = () => {
    if (watcherId.current !== null) {
      navigator.geolocation.clearWatch(watcherId.current);
      watcherId.current = null;
    }
    setIsTracking(false);
  };

  const startUpdating = (orderId) => {
    if (!("geolocation" in navigator) || !orderId || watcherId.current !== null) {
      return;
    }

    watcherId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updatedAt: Date.now(),
        };

        setLocation(loc);

        const userId = auth.currentUser?.uid;
        const writes = [updateDoc(doc(db, "orders", orderId), { courierLocation: loc })];

        if (userId) {
          writes.push(
            updateDoc(doc(db, "partners", userId), {
              location: loc,
              lastKnownLocation: loc,
              lastLocationPingAt: Date.now(),
            })
          );
        }

        await Promise.allSettled(writes);
        setIsTracking(true);
      },
      (error) => {
        console.warn("Geo Error:", error.message);
        stopUpdating();
      },
      DEFAULT_OPTIONS
    );
  };

  useEffect(() => stopUpdating, []);

  return { location, isTracking, startUpdating, stopUpdating };
}
