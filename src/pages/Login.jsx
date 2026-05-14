import React, { useState } from "react";
import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Mail, SmilePlus } from "lucide-react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { auth } from "../firebase/firebaseConfig";
import AuthExperienceShell from "../components/AuthExperienceShell";

const inputClassName =
  "w-full rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/25 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back to HungryBox.");
      navigate("/profile");
    } catch (loginError) {
      setError("Login failed. Please check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setError("");
    setSubmitting(true);
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in with Google.");
      navigate("/profile");
    } catch (loginError) {
      console.error(loginError);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const userEmail = window.prompt("Enter your registered email to receive a reset link:");
    if (!userEmail) return;

    try {
      await sendPasswordResetEmail(auth, userEmail);
      toast.success("Password reset email sent.");
    } catch (resetError) {
      toast.error(resetError.message || "Could not send reset email.");
    }
  };

  return (
    <AuthExperienceShell
      eyebrow="Welcome Back"
      title="Sign in and pick up where your last sweet order left off."
      subtitle="Check live orders, revisit your favourites, and get back to checkout in just a moment."
      promptTitle="A warmer way back into your food and cake routine."
      promptText="We’ve made the sign-in moment feel lighter, kinder, and closer to the joyful HungryBox vibe. Step back in and let us carry the order flow for you."
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Mail size={16} />
            Email address
          </span>
          <input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            className={inputClassName}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <KeyRound size={16} />
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className={inputClassName}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(244,114,182,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Signing you in..." : "Login to HungryBox"}
          <ArrowRight size={16} />
        </motion.button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <FcGoogle size={22} />
          Continue with Google
        </button>

        <div className="flex flex-col gap-3 pt-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-left font-medium text-pink-600 transition hover:text-pink-700 dark:text-pink-300 dark:hover:text-pink-200"
          >
            Forgot password?
          </button>
          <p className="text-slate-500 dark:text-slate-400">
            New here?{" "}
            <Link to="/signup" className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white">
              Create your account
            </Link>
          </p>
        </div>
      </form>

      <div className="mt-6 rounded-[26px] border border-white/70 bg-gradient-to-r from-pink-50 to-orange-50 px-4 py-4 dark:border-white/10 dark:bg-gradient-to-r dark:from-pink-500/10 dark:to-orange-400/10">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <SmilePlus size={16} className="text-pink-500" />
          A little welcome from us
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          HungryBox is happy to have you back. Your favourite cakes, local shops, and live delivery updates are waiting right where you left them.
        </p>
      </div>
    </AuthExperienceShell>
  );
}
