// src/pages/DeliveryAuth.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { auth, db } from "../firebase/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

const DeliveryAuth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", user.uid), {
          email,
          role: "delivery",
          name,
          createdAt: new Date().toISOString(),
        });
        toast.success("🚚 Delivery partner registered!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("✅ Logged in successfully!");
      }

      // Auto-redirect to dashboard after login/signup
      setTimeout(() => {
        navigate("/partner/dashboard", { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.message);
      toast.error("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-200 via-pink-100 to-yellow-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 px-4 py-12">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 max-w-md w-full space-y-6 border border-pink-300 dark:border-gray-700"
      >
        <h2 className="text-3xl font-bold text-center text-pink-600 dark:text-yellow-300">
          {isSignup ? "🚚 Delivery Partner Signup" : "🔐 Partner Login"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium">👤 Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">📧 Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">🔒 Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:text-white"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.05 }}
            type="submit"
            className="w-full py-2 rounded bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-lg transition duration-300"
            disabled={loading}
          >
            {loading ? "⏳ Please wait..." : isSignup ? "📬 Sign Up" : "🚪 Log In"}
          </motion.button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600 dark:text-gray-300">
          {isSignup ? "Already have an account?" : "New delivery partner?"}{" "}
          <button
            className="text-pink-600 hover:underline dark:text-yellow-300"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Log In" : "Sign Up"}
          </button>
        </p>

        <p className="text-xs text-center text-gray-400 mt-2">
          Back to{" "}
          <Link to="/" className="underline text-blue-500">
            Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default DeliveryAuth;
