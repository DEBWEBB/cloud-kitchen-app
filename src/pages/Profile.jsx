import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Camera,
  Clock3,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import getCroppedImg from "../utils/cropImage";
import normalizeSupabaseAssetUrl from "../utils/normalizeSupabaseAssetUrl";
import { uploadAvatar } from "../utils/uploadAvatar";
import fallbackAvatar from "../assets/HungryBOX-logo.jpg";

const createDefaultProfile = (email = "") => ({
  name: "",
  email,
  phone: "",
  address: "",
  photoURL: "",
  location: null,
  locationUpdatedAt: "",
});

const formatCoordinate = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value.toFixed(5) : "--";

const formatLocationTimestamp = (value) => {
  if (!value) return "Not captured yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not captured yet";
  return parsed.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() =>
    createDefaultProfile(user?.email || "")
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [cropData, setCropData] = useState(null);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const fileRef = useRef(null);

  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        const baseProfile = createDefaultProfile(user?.email || "");

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            ...baseProfile,
            ...data,
            email: typeof data.email === "string" ? data.email : user?.email || "",
            photoURL: normalizeSupabaseAssetUrl(data.photoURL),
            location:
              data?.location &&
              typeof data.location.lat === "number" &&
              typeof data.location.lng === "number"
                ? {
                    lat: data.location.lat,
                    lng: data.location.lng,
                  }
                : null,
            locationUpdatedAt:
              typeof data.locationUpdatedAt === "string"
                ? data.locationUpdatedAt
                : "",
          });
          return;
        }

        setProfile(baseProfile);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.email, userId]);

  const handleChange = (event) => {
    setProfile((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const docRef = doc(db, "users", userId);
      await setDoc(
        docRef,
        {
          name: profile.name,
          email: profile.email || user?.email || "",
          phone: profile.phone,
          address: profile.address,
          photoURL: profile.photoURL,
          location: profile.location || null,
          locationUpdatedAt: profile.locationUpdatedAt || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Profile updated!");
    } catch {
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCropAndUpload = async () => {
    if (!selectedImage || !userId) return;

    try {
      setUploading(true);

      const croppedImage = cropData
        ? await getCroppedImg(selectedImage, cropData)
        : selectedImage;

      const blob =
        croppedImage instanceof Blob
          ? croppedImage
          : await fetch(croppedImage).then((response) => response.blob());

      const avatarFile = new File([blob], "avatar.jpg", {
        type: "image/jpeg",
      });

      const photoURL = await uploadAvatar(userId, avatarFile);

      setProfile((prev) => ({ ...prev, photoURL }));
      setAvatarVersion(Date.now());
      await setDoc(
        doc(db, "users", userId),
        { photoURL, updatedAt: serverTimestamp() },
        { merge: true }
      );
      toast.success("Photo updated!");
      setSelectedImage(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch (error) {
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const captureCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        };
        const locationUpdatedAt = new Date().toISOString();

        setProfile((current) => ({
          ...current,
          location: nextLocation,
          locationUpdatedAt,
        }));
        setLocating(false);
        toast.success("Current location captured.");
      },
      () => {
        setLocating(false);
        toast.error("Could not capture your current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const profileStats = useMemo(
    () => [
      {
        label: "Profile status",
        value: profile.name && profile.phone ? "Ready" : "Incomplete",
        icon: ShieldCheck,
      },
      {
        label: "Email",
        value: profile.email || user?.email || "Not set",
        icon: Mail,
      },
      {
        label: "Location sync",
        value: profile.location ? "Live captured" : "Pending",
        icon: MapPin,
      },
    ],
    [profile.email, profile.location, profile.name, profile.phone, user?.email]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,#fff7f8_0%,#fffdfb_45%,#fff5ef_100%)] px-4 py-24 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#050816_0%,#0f172a_48%,#111827_100%)] dark:text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.92))] p-6 text-white shadow-[0_26px_70px_rgba(15,23,42,0.16)]"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-6%] top-[-18%] h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
            <div className="absolute right-[-2%] top-4 h-44 w-44 rounded-full bg-orange-400/20 blur-3xl" />
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-pink-100">
                <Sparkles className="h-4 w-4" />
                Personal hub
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                  Your profile, delivery details, and live location in one place.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                  Keep your HungryBox identity clean and up to date. Your saved profile,
                  photo, address, and current location help make checkout, tracking,
                  and order support much smoother.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {profileStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur"
                >
                  <div className="flex items-center gap-2 text-white/60">
                    <stat.icon className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em]">
                      {stat.label}
                    </p>
                  </div>
                  <p className="mt-3 break-words text-lg font-bold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <div className="flex flex-col items-center text-center">
              <motion.img
                whileHover={{ scale: 1.04 }}
                src={
                  profile.photoURL
                    ? `${profile.photoURL}${profile.photoURL.includes("?") ? "&" : "?"}v=${avatarVersion}`
                    : fallbackAvatar
                }
                alt="Profile"
                className="h-32 w-32 rounded-full border-4 border-pink-400 object-cover shadow-xl"
                onError={(event) => {
                  event.currentTarget.src = fallbackAvatar;
                }}
              />
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {profile.name || "HungryBox customer"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {profile.email || user?.email || "No email available"}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <StatusCard
                icon={Phone}
                label="Phone"
                value={profile.phone || "Add your number"}
              />
              <StatusCard
                icon={Clock3}
                label="Location updated"
                value={formatLocationTimestamp(profile.locationUpdatedAt)}
              />
              <StatusCard
                icon={LocateFixed}
                label="Coordinates"
                value={
                  profile.location
                    ? `${formatCoordinate(profile.location.lat)}, ${formatCoordinate(profile.location.lng)}`
                    : "Capture current location"
                }
              />
            </div>

            <div className="mt-6 space-y-3">
              <label
                htmlFor="profile_avatar_upload"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-pink-300 hover:text-pink-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
              >
                <Camera className="h-4 w-4" />
                {profile.photoURL ? "Change profile photo" : "Upload profile photo"}
              </label>
              <input
                id="profile_avatar_upload"
                type="file"
                accept="image/*"
                ref={fileRef}
                onChange={handleImageUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={captureCurrentLocation}
                disabled={locating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(244,114,182,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LocateFixed className="h-4 w-4" />
                {locating ? "Capturing location..." : "Use current location"}
              </button>
            </div>

            {(uploading || loading) && (
              <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                {uploading ? "Uploading image..." : "Saving profile..."}
              </p>
            )}
          </aside>

          <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            {selectedImage ? (
              <div className="rounded-[1.7rem] border border-pink-100 bg-pink-50/70 p-5 dark:border-pink-900/40 dark:bg-pink-950/20">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pink-500">
                  Avatar preview
                </p>
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="mt-4 max-h-72 w-full rounded-[1.5rem] border object-contain"
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleCropAndUpload}
                    className="inline-flex items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(16,185,129,0.18)] transition hover:translate-y-[-1px]"
                    disabled={uploading}
                  >
                    <Camera className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Crop & upload"}
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="inline-flex items-center justify-center rounded-[1.1rem] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-100"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Full name"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
              <Field
                label="Phone number"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Enter your phone"
              />
              <Field
                label="Email"
                name="email"
                value={profile.email || user?.email || ""}
                disabled
                placeholder="Email"
              />
              <Field
                label="Latitude / Longitude"
                name="locationPreview"
                value={
                  profile.location
                    ? `${formatCoordinate(profile.location.lat)}, ${formatCoordinate(profile.location.lng)}`
                    : ""
                }
                disabled
                placeholder="Tap 'Use current location' to fill this"
              />
              <div className="md:col-span-2">
                <Field
                  label="Address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Enter your delivery address"
                  multiline
                />
              </div>
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/45">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Instant location snapshot
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <LocationMetric
                  label="Latitude"
                  value={formatCoordinate(profile.location?.lat)}
                />
                <LocationMetric
                  label="Longitude"
                  value={formatCoordinate(profile.location?.lng)}
                />
                <LocationMetric
                  label="Captured"
                  value={formatLocationTimestamp(profile.locationUpdatedAt)}
                />
              </div>
            </div>

            <motion.button
              onClick={handleSave}
              whileTap={{ scale: 0.98 }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,114,182,0.22)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save profile changes"}
            </motion.button>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/45">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  disabled = false,
  multiline = false,
}) {
  const className =
    "w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-pink-400 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/45 dark:text-white dark:disabled:bg-slate-800";

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          rows={4}
          disabled={disabled}
        />
      ) : (
        <input
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function LocationMetric({ label, value }) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
