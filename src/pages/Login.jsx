import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/profile");
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed");
    }
  };

  const handleForgotPassword = async () => {
    const userEmail = prompt("Please enter your registered email:");
    if (!userEmail) return;

    try {
      await sendPasswordResetEmail(auth, userEmail);
      alert("Password reset email sent! 📬");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-pink-600 to-red-500 flex items-center justify-center relative overflow-hidden">
      {/* 🫧 Animated Blobs */}
      <motion.div
        className="absolute w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"
        initial={{ x: -200, y: -200 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 15, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute w-80 h-80 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"
        initial={{ x: 200, y: 200 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"
        initial={{ x: -100, y: 300 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }}
      />

      {/* 🧊 Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="backdrop-blur-xl bg-white/30 dark:bg-gray-900/30 shadow-2xl border border-white/20 p-8 rounded-2xl max-w-md w-full z-10"
      >
        <h2 className="text-4xl font-extrabold text-center text-white mb-6 drop-shadow">
          🔐 Login to HungryBox
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="email"
            placeholder="Enter email"
            className="w-full px-5 py-3 rounded-xl bg-white/60 dark:bg-gray-700 border border-white/30 dark:border-gray-600 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:ring-2 ring-pink-500 outline-none transition-all duration-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter password"
            className="w-full px-5 py-3 rounded-xl bg-white/60 dark:bg-gray-700 border border-white/30 dark:border-gray-600 text-black dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:ring-2 ring-pink-500 outline-none transition-all duration-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-red-300 text-sm text-center">{error}</p>
          )}

          {/* 🔘 Login Button with glow */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05, boxShadow: "0 0 15px #ec4899" }}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-5 rounded-xl transition-all duration-300 shadow-lg"
          >
            Login
          </motion.button>

          {/* 🌐 Google Login Button */}
          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            whileHover={{ scale: 1.05 }}
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 font-semibold py-3 px-5 rounded-xl border border-gray-300 hover:bg-gray-100 transition-all duration-300"
          >
            <FcGoogle size={24} /> Sign in with Google
          </motion.button>

          {/* 🔁 Forgot password */}
          <p
            onClick={handleForgotPassword}
            className="text-sm text-white text-center mt-3 underline cursor-pointer hover:text-yellow-200 transition duration-300"
          >
            Forgot Password?
          </p>

          {/* 🔁 Link to Signup */}
          <p className="mt-5 text-center text-white text-sm">
            Don’t have an account?{" "}
            <a
              href="/signup"
              className="text-blue-200 hover:underline hover:text-yellow-300 transition"
            >
              Sign up here
            </a>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
