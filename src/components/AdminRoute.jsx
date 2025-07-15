// src/components/AdminRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin:", error);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  if (!user) return <Navigate to="/login" />;
  if (isAdmin === null) return <div className="p-10 text-center">Checking permissions...</div>;
  if (!isAdmin) return <div className="p-10 text-center text-red-600">Access Denied: Admins only.</div>;

  return children;
}
