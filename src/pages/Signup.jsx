import React, { useState } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Mail, Sparkles, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { auth, db } from "../firebase/firebaseConfig";
import AuthExperienceShell from "../components/AuthExperienceShell";

const inputClassName =
  "w-full rounded-[22px] border border-slate-200 bg-white/90 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/25 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:placeholder:text-slate-500";

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

  const handleSignup = async (event) => {
    event.preventDefault();
    const { name, email, password, confirmPassword } = form;

    if (!name || !email || !password || !confirmPassword) {
      setError("Please complete every field before joining.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        email,
        createdAt: new Date().toISOString(),
      });

      toast.success("Your account is ready. Welcome to HungryBox.");
      navigate("/profile");
    } catch (signupError) {
      setError(signupError.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      toast.success("Signed up with Google.");
      navigate("/profile");
    } catch (signupError) {
      setError(`Google signup failed: ${signupError.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthExperienceShell
      eyebrow="Join HungryBox"
      title="Create an account that feels as sweet as the orders you’re about to place."
      subtitle="Save your details, track every delivery, and keep your favourite local bakery picks close at hand."
      promptTitle="A kinder, brighter start to your next cake-and-delivery habit."
      promptText="We want the first step to feel warm and welcoming too. Sign up once, then enjoy faster checkouts, clearer delivery updates, and a more personal HungryBox experience."
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <UserRound size={16} />
            Full name
          </span>
          <input
            type="text"
            autoComplete="name"
            placeholder="Your good name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Mail size={16} />
            Email address
          </span>
          <input
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className={inputClassName}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <KeyRound size={16} />
              Password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Create password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <KeyRound size={16} />
              Confirm password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              className={inputClassName}
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(244,114,182,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Creating your account..." : "Create HungryBox account"}
          <ArrowRight size={16} />
        </motion.button>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <FcGoogle size={22} />
          Sign up with Google
        </button>

        <p className="pt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white">
            Login here
          </Link>
        </p>
      </form>

      <div className="mt-6 rounded-[26px] border border-white/70 bg-gradient-to-r from-pink-50 to-orange-50 px-4 py-4 dark:border-white/10 dark:bg-gradient-to-r dark:from-pink-500/10 dark:to-orange-400/10">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <Sparkles size={16} className="text-pink-500" />
          A sweet note before you begin
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Thank you for giving HungryBox a place in your day. We’ll keep the experience warm, local, and joyful from signup to doorstep.
        </p>
      </div>
    </AuthExperienceShell>
  );
}
