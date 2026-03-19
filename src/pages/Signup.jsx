import React, { useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = form;

    if (!name || !email || !password || !confirmPassword) {
      return setError("Please fill all fields.");
    }

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      alert("Signup successful!");
      navigate("/profile");
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      alert("Signed in with Google!");
      navigate("/profile");
    } catch (error) {
      setError("Google Sign-in failed: " + error.message);
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* 🟣 Glowing Animated Blobs */}
      <motion.div
        className="absolute w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob z-0"
        initial={{ x: -200, y: -100 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 15, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob z-0"
        initial={{ x: 300, y: 200 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob z-0"
        initial={{ x: -150, y: 300 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* 💠 Signup Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl max-w-md w-full p-8 text-white"
      >
        <h2 className="text-3xl font-bold text-center mb-6 drop-shadow-lg">
          🍰 Join Cloud Kitchen
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            autoComplete="name"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2 rounded-md bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-pink-400 outline-none"
          />
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2 rounded-md bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-pink-400 outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2 rounded-md bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-pink-400 outline-none"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full px-4 py-2 rounded-md bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-pink-400 outline-none"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-md font-semibold shadow-md hover:shadow-pink-500/50 transition duration-300"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* 🔁 Login link */}
        <p className="text-sm text-center mt-4 text-white">
          Already have an account?{" "}
          <Link to="/login" className="text-yellow-300 hover:underline">
            Login here
          </Link>
        </p>

        {/* 🟢 Google Signup */}
        <div className="mt-6 text-center">
          <p className="text-gray-300">— or —</p>
          <button
            onClick={handleGoogleSignup}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md shadow-md hover:shadow-blue-400/50 transition duration-300"
          >
            Sign Up with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}
