import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "../firebase/firebaseConfig";
import { uploadPartnerSecurityAsset } from "../utils/uploadPartnerSecurityAsset";

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

          {isSignup && (
            <div>
              <label className="block text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 w-full rounded bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
                placeholder="10-digit mobile number"
                required
              />
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm font-medium">Aadhaar Number</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={aadhaarNumber}
                onChange={(event) => setAadhaarNumber(normalizeAadhaar(event.target.value))}
                className="mt-1 w-full rounded bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
                placeholder="12-digit Aadhaar number"
                required
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Stored securely as masked metadata plus a protected document record.
              </p>
            </div>
          )}

          {isSignup && (
            <div>
              <label className="block text-sm font-medium">Aadhaar Card Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setAadhaarImage(event.target.files?.[0] || null)}
                className="mt-1 w-full rounded bg-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-800 dark:text-white"
                required
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Upload a clear front image of the Aadhaar card for delivery partner KYC.
              </p>
              {aadhaarPreviewUrl ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-pink-200 bg-pink-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
                    Aadhaar preview
                  </p>
                  <img
                    src={aadhaarPreviewUrl}
                    alt="Aadhaar card preview"
                    className="h-40 w-full rounded-xl object-cover"
                  />
                </div>
              ) : null}
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
