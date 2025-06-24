import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebaseConfig";

const PrivateRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div className="text-center p-10 text-xl">Checking login status...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
