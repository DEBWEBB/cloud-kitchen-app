import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "../firebase/firebaseConfig";
import { uploadPartnerSecurityAsset } from "../utils/uploadPartnerSecurityAsset";
import AuthExperienceShell from "../components/AuthExperienceShell";

const DeliveryAuth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState(null);
  const [aadhaarPreviewUrl, setAadhaarPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const normalizeAadhaar = (value = "") => value.replace(/\D/g, "").slice(0, 12);
  const maskAadhaar = (value = "") => {
    const digits = normalizeAadhaar(value);
    if (digits.length !== 12) return "";
    return `XXXX-XXXX-${digits.slice(-4)}`;
  };

  useEffect(() => {
    if (!aadhaarImage) {
      setAadhaarPreviewUrl("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(aadhaarImage);
    setAadhaarPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [aadhaarImage]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        const normalizedPhone = phone.replace(/\D/g, "");
        const normalizedAadhaar = normalizeAadhaar(aadhaarNumber);

        if (normalizedPhone.length < 10) {
          throw new Error("Enter a valid delivery partner phone number.");
        }

        if (normalizedAadhaar.length !== 12) {
          throw new Error("Enter a valid 12-digit Aadhaar number.");
        }

        if (!aadhaarImage) {
          throw new Error("Upload the Aadhaar card image for partner registration.");
        }

        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const securityAsset = await uploadPartnerSecurityAsset({
          userId: user.uid,
          kind: "aadhaar-card",
          sourceFile: aadhaarImage,
        });

        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          role: "delivery",
          name,
          phone: normalizedPhone,
          createdAt: new Date().toISOString(),
        });

        await setDoc(
          doc(db, "partners", user.uid),
          {
            uid: user.uid,
            email,
            name,
            phone: normalizedPhone,
            isOnline: false,
            isVerified: true,
            location: null,
            lastKnownLocation: null,
            currentOrderId: null,
            earnings: 0,
            averageRating: 0,
            deliveriesCompleted: 0,
            aadhaarMasked: maskAadhaar(normalizedAadhaar),
            aadhaarLast4: normalizedAadhaar.slice(-4),
            aadhaarAssetId: securityAsset.assetId,
            aadhaarStoredAt: securityAsset.storedAt,
            aadhaarVerified: false,
            shiftVerifiedDate: "",
            shiftStartedAt: null,
            shiftEndsAt: null,
            shiftExpiryPending: false,
            lastShiftSelfieAssetId: "",
            lastShiftSelfieAt: null,
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
    <AuthExperienceShell
      eyebrow="Partner Portal"
      title={isSignup ? "Start your trusted rider profile." : "Welcome back to the rider desk."}
      subtitle={
        isSignup
          ? "Complete your delivery partner registration with identity details, Aadhaar verification, and mobile-ready onboarding."
          : "Log in to manage live orders, secure shift OTP verification, proof capture, and real-time delivery tracking."
      }
      promptTitle="Fast delivery, secure identity, and a smooth mobile rider experience."
      promptText="HungryBox delivery partners work mostly from mobile. This portal is built to keep shift start, proof capture, and order updates simple even when you are moving between pickups and drop-offs."
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="space-y-5"
      >
        <div className="rounded-[28px] border border-pink-100 bg-gradient-to-r from-pink-50 via-orange-50 to-white px-4 py-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500 dark:text-pink-300">
            Rider Access
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {isSignup ? "Delivery Partner Signup" : "Partner Login"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {isSignup
              ? "Create your rider account, upload your KYC record, and get ready for OTP-protected shifts."
              : "Sign in to start your secure shift, manage assigned orders, and keep customers updated in real time."}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="10-digit mobile number"
                required
              />
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Aadhaar Number</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={aadhaarNumber}
                onChange={(event) => setAadhaarNumber(normalizeAadhaar(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="12-digit Aadhaar number"
                required
              />
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Stored securely as masked metadata plus a protected document record.
              </p>
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Aadhaar Card Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setAadhaarImage(event.target.files?.[0] || null)}
                className="mt-2 w-full rounded-2xl border border-dashed border-pink-200 bg-pink-50/70 px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                required
              />
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Upload a clear front image of the Aadhaar card for delivery partner KYC.
              </p>
              {aadhaarPreviewUrl ? (
                <div className="mt-3 overflow-hidden rounded-[24px] border border-pink-200 bg-pink-50/80 p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
                    Aadhaar preview
                  </p>
                  <img
                    src={aadhaarPreviewUrl}
                    alt="Aadhaar card preview"
                    className="h-44 w-full rounded-2xl object-cover"
                  />
                </div>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              required
            />
          </div>

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300">
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 font-semibold text-white shadow-[0_18px_40px_-18px_rgba(244,114,182,0.8)] transition duration-300 hover:opacity-95"
            disabled={loading}
          >
            {loading ? "Please wait..." : isSignup ? "Create Partner Account" : "Log In"}
          </motion.button>
        </form>

        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          {isSignup ? "Already have an account?" : "New delivery partner?"}{" "}
          <button
            className="font-semibold text-pink-600 hover:underline dark:text-yellow-300"
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Log In" : "Sign Up"}
          </button>
        </p>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Back to{" "}
          <Link to="/" className="font-medium text-pink-500 underline">
            Home
          </Link>
        </p>
      </motion.div>
    </AuthExperienceShell>
  );
};

export default DeliveryAuth;
