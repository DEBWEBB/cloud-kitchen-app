import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Camera, Loader2, PackageCheck, ShieldCheck, Star } from "lucide-react";
import { db } from "../../firebase/firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import normalizeSupabaseAssetUrl from "../../utils/normalizeSupabaseAssetUrl";
import { uploadAvatar } from "../../utils/uploadAvatar";
import fallbackAvatar from "../../assets/HungryBOX-logo.jpg";

const createDefaultProfile = () => ({
  name: "",
  phone: "",
  serviceArea: "",
  photoURL: "",
  averageRating: 0,
  deliveriesCompleted: 0,
  isVerified: false,
});

const normalizePartnerProfile = (data = {}) => ({
  name: typeof data.name === "string" ? data.name : "",
  phone: typeof data.phone === "string" ? data.phone : "",
  serviceArea:
    typeof data.serviceArea === "string"
      ? data.serviceArea
      : typeof data.location === "string"
        ? data.location
        : "",
  photoURL: normalizeSupabaseAssetUrl(
    typeof data.photoURL === "string" ? data.photoURL : ""
  ),
  averageRating:
    typeof data.averageRating === "number" ? data.averageRating : 0,
  deliveriesCompleted:
    typeof data.deliveriesCompleted === "number" ? data.deliveriesCompleted : 0,
  isVerified: Boolean(data.isVerified),
});

export default function PartnerProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  const webcamRef = useRef(null);

  const [profile, setProfile] = useState(createDefaultProfile);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;

      try {
        setLoading(true);
        const snapshot = await getDoc(doc(db, "partners", uid));
        if (snapshot.exists()) {
          setProfile(normalizePartnerProfile(snapshot.data()));
        } else {
          setProfile(createDefaultProfile());
        }
      } catch (error) {
        console.error("Partner profile load failed:", error);
        toast.error("Could not load partner profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      [name]: value ?? "",
    }));
  };

  const handleSave = async () => {
    if (!uid) return;

    if (!profile.name.trim() || !profile.phone.trim() || !profile.serviceArea.trim()) {
      toast.error("Name, phone, and service area are required.");
      return;
    }

    if (!profile.photoURL) {
      toast.error("Please take a live selfie before saving.");
      setShowCamera(true);
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, "partners", uid),
        {
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          serviceArea: profile.serviceArea.trim(),
          photoURL: profile.photoURL,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Partner profile updated.");
    } catch (error) {
      console.error("Partner profile save failed:", error);
      toast.error("Failed to update partner profile.");
    } finally {
      setSaving(false);
    }
  };

  const captureAndUploadSelfie = async () => {
    if (!uid) return;

    const screenshot = webcamRef.current?.getScreenshot();
    if (!screenshot) {
      toast.error("Camera image was not captured. Try again.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(screenshot);
      const blob = await response.blob();
      const avatarFile = new File([blob], "partner-selfie.jpg", {
        type: "image/jpeg",
      });
      const photoURL = await uploadAvatar(uid, avatarFile);

      await setDoc(
        doc(db, "partners", uid),
        {
          photoURL,
          selfieVerifiedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfile((current) => ({ ...current, photoURL }));
      setAvatarVersion(Date.now());
      setShowCamera(false);
      toast.success("Live selfie uploaded.");
    } catch (error) {
      console.error("Partner selfie upload failed:", error);
      toast.error(error.message || "Failed to upload live selfie.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile.name && !profile.phone && !profile.photoURL) {
    return (
      <div className="page-container pt-28">
        <div className="card mx-auto max-w-2xl p-10 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-pink-500" />
          <p className="muted">Loading partner profile...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="page-container pb-28 pt-20 md:pt-24"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="card mx-auto max-w-4xl overflow-hidden p-0">
        <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-6 text-white sm:px-6 sm:py-7">
          <span className="chip inline-flex border border-white/20 bg-white/15 text-white">
            Delivery partner
          </span>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Partner Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
            Keep your public profile accurate and maintain selfie verification for deliveries.
          </p>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[290px_1fr]">
          <aside className="space-y-4 rounded-3xl bg-gray-50 p-5 dark:bg-gray-800/70 lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col items-center text-center">
              <motion.img
                whileHover={{ scale: 1.03 }}
                src={
                  profile.photoURL
                    ? `${profile.photoURL}${profile.photoURL.includes("?") ? "&" : "?"}v=${avatarVersion}`
                    : fallbackAvatar
                }
                alt="Partner avatar"
                className="h-32 w-32 rounded-full border-4 border-pink-400 object-cover shadow-lg"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
              <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                {profile.name || "Delivery Partner"}
              </h2>
              <p className="muted mt-1">{user?.email || "No email available"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900/70">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <ShieldCheck size={16} />
                  <span className="text-sm">Verification</span>
                </div>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {profile.photoURL ? "Selfie uploaded" : "Selfie required"}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900/70">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Star size={16} />
                  <span className="text-sm">Rating</span>
                </div>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {profile.averageRating > 0 ? profile.averageRating.toFixed(1) : "N/A"}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900/70">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <PackageCheck size={16} />
                  <span className="text-sm">Deliveries</span>
                </div>
                <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {profile.deliveriesCompleted || 0}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-ghost flex w-full items-center justify-center gap-2 rounded-2xl"
              onClick={() => setShowCamera((current) => !current)}
            >
              <Camera size={16} />
              {showCamera
                ? "Close Camera"
                : profile.photoURL
                  ? "Retake Live Selfie"
                  : "Take Live Selfie"}
            </button>
          </aside>

          <section className="space-y-5">
            {showCamera && (
              <div className="rounded-3xl border border-pink-100 bg-pink-50/70 p-4 dark:border-pink-900/40 dark:bg-pink-950/20">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Live Selfie Verification
                    </h2>
                    <p className="muted mt-1">
                      Use the front camera and upload a fresh selfie only when you want to verify or update your profile photo.
                    </p>
                  </div>
                </div>

                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user" }}
                  className="h-[220px] w-full rounded-2xl border border-pink-200 object-cover dark:border-pink-900/40 sm:h-[260px]"
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={captureAndUploadSelfie}
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? "Uploading..." : "Upload Live Selfie"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCamera(false)}
                    disabled={loading}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!profile.photoURL && !showCamera && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                A live selfie is required before you save your partner profile.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="rounded-2xl border border-pink-100 bg-pink-50/80 px-4 py-3 text-sm leading-6 text-pink-700 dark:border-pink-900/30 dark:bg-pink-950/20 dark:text-pink-200">
                  Keep this profile current so customers, stores, and operations can trust the details shown during a live delivery.
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service Area
                </label>
                <input
                  name="serviceArea"
                  value={profile.serviceArea}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:ring-2 focus:ring-pink-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder="Ex: Krishnanagar, Nadia"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              className="btn-primary sticky bottom-4 z-10 w-full justify-center rounded-2xl shadow-[0_18px_40px_-20px_rgba(244,114,182,0.75)]"
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Partner Profile"}
            </button>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
