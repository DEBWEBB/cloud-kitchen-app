import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebaseConfig";

export default function CourierDashboard() {
  const [user] = useAuthState(auth);

  if (!user) {
    return (
      <div className="p-10 text-center text-red-600">
        Access denied. Please log in as a delivery partner.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-black dark:text-white p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Courier Dashboard</h1>
      <p>Welcome, <strong>{user.email}</strong>!</p>

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Your Assigned Deliveries</h2>
        <ul className="mt-2 space-y-2">
          <li className="p-4 bg-white dark:bg-gray-800 rounded shadow">Order #1234 - Mia More</li>
          <li className="p-4 bg-white dark:bg-gray-800 rounded shadow">Order #1235 - Monginis</li>
          <li className="p-4 bg-white dark:bg-gray-800 rounded shadow">Order #1236 - Fresh Bites</li>
        </ul>
      </div>

      <div className="mt-8">
        <button
          onClick={() => auth.signOut()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
