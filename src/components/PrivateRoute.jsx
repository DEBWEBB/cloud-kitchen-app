// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children }) => {
  const { user, isAnonymous } = useAuth();

  if (user === null) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">
        🔐 Checking authentication...
      </div>
    );
  }

  if (!user || isAnonymous) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PrivateRoute;
