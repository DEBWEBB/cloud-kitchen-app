import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 dark:from-gray-900 dark:via-gray-800 dark:to-black p-4">
      <div className="backdrop-blur-md bg-white/10 dark:bg-black/30 shadow-xl rounded-xl p-8 max-w-md w-full text-white border border-white/20">
        <h2 className="text-3xl font-bold text-center mb-4">👤 My Profile</h2>

        {user ? (
          <>
            <div className="mb-6">
              <p><strong>UID:</strong> {user.uid}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Verified:</strong> {user.emailVerified ? "Yes" : "No"}</p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-4 py-2 rounded-md bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="9734278080"
                  className="w-full px-4 py-2 rounded-md bg-white/20 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white"
                  
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 transition px-4 py-2 rounded-md font-semibold"
              >
                Save Changes
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="w-full mt-6 bg-red-500 hover:bg-red-600 transition px-4 py-2 rounded-md font-semibold"
            >
              Logout
            </button>
          </>
        ) : (
          <p className="text-center">Loading user info...</p>
        )}
      </div>
    </div>
  );
}
