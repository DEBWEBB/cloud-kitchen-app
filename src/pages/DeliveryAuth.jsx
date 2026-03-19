import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "../firebase/firebaseConfig";

const DeliveryAuth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          role: "delivery",
          name,
          createdAt: new Date().toISOString(),
        });

        await setDoc(
          doc(db, "partners", user.uid),
          {
            uid: user.uid,
            email,
            name,
            phone: "",
            isOnline: false,
            isVerified: true,
            location: null,
            lastKnownLocation: null,
            currentOrderId: null,
            earnings: 0,
            averageRating: 0,
            deliveriesCompleted: 0,
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );

        toast.success("Delivery partner registered.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Logged in successfully.");
      }

      setTimeout(() => {
        navigate("/partner/dashboard", { replace: true });
      }, 700);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-blue-200 via-pink-100 to-yellow-100 px-4 py-12 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-6 rounded-xl border border-pink-300 bg-white p-8 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <h2 className="text-center text-3xl font-bold text-pink-600 dark:text-yellow-300">
          {isSignup ? "Delivery Partner Signup" : "Partner Login"}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            type="submit"
            className="w-full rounded bg-pink-500 py-2 font-semibold text-white shadow-lg transition duration-300 hover:bg-pink-600"
            disabled={loading}
          >
            {loading ? "Please wait..." : isSignup ? "Sign Up" : "Log In"}
          </motion.button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          {isSignup ? "Already have an account?" : "New delivery partner?"}{" "}
          <button
            className="text-pink-600 hover:underline dark:text-yellow-300"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Log In" : "Sign Up"}
          </button>
        </p>

        <p className="mt-2 text-center text-xs text-gray-400">
          Back to{" "}
          <Link to="/" className="text-blue-500 underline">
            Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default DeliveryAuth;
