import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Loader2, Star, PackageCheck, Camera } from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    location: "",
    photoURL: "",
    averageRating: 0,
    deliveriesCompleted: 0,
  });

  const [editing, setEditing] = useState(false);
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const uid = user?.uid;

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      const docRef = doc(db, "partners", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile((prev) => ({
          ...prev,
          ...docSnap.data(),
        }));
      }
    };
    fetchProfile();
  }, [uid]);

  // Handle input changes: clear selfie and open modal
  const handleChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      photoURL: "",
    }));
    setEditing(true);
    setShowSelfieModal(true);
  };

  // Save profile (requires selfie)
  const handleSave = async () => {
    if (!profile.name || !profile.phone || !profile.location) {
      toast.error("All fields are required!");
      return;
    }
    if (!profile.photoURL) {
      toast.error("Please upload a live selfie before saving.");
      setShowSelfieModal(true);
      return;
    }
    try {
      setLoading(true);
      await setDoc(doc(db, "partners", uid), { ...profile }, { merge: true });
      toast.success("Profile updated!");
      setEditing(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Capture and upload selfie to Supabase Storage
  const captureAndUploadSelfie = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot || !uid) return;

    try {
      setLoading(true);
      // Convert base64 to blob
      const response = await fetch(screenshot);
      const blob = await response.blob();
      const filePath = `partners/${uid}.jpg`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const photoURL = data?.publicUrl;

      // Save to Firestore
      await setDoc(doc(db, "partners", uid), { photoURL }, { merge: true });

      setProfile((prev) => ({ ...prev, photoURL }));
      toast.success("Selfie uploaded!");
      setShowSelfieModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload selfie");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="pt-24 pb-16 px-4 max-w-lg mx-auto bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl min-h-screen"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <motion.h2
        className="text-4xl font-extrabold text-center mb-8 text-gray-800 dark:text-white tracking-tight"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Partner Profile
      </motion.h2>

      <motion.div
        className="flex flex-col items-center mb-6 relative"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <motion.img
          whileHover={{ scale: 1.08, rotate: 2 }}
          src={profile.photoURL ? `${profile.photoURL}?t=${Date.now()}` : "/default-avatar.png"}
          alt="Selfie"
          className="w-36 h-36 rounded-full object-cover border-4 border-blue-500 shadow-xl transition-all duration-300"
        />
        <motion.button
          type="button"
          className="absolute bottom-3 right-6 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1 shadow-lg transition"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSelfieModal(true)}
        >
          <Camera size={16} /> Retake Selfie
        </motion.button>
      </motion.div>

      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Your Name</label>
          <input
            name="name"
            value={profile.name}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400 transition"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
          <input
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400 transition"
            placeholder="Enter your phone"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Your Area / Location</label>
          <input
            name="location"
            value={profile.location}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-400 transition"
            placeholder="Enter your area"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Email (Read-only)</label>
          <input
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-700 dark:text-white"
          />
        </div>
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        className={`mt-8 w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-3 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
          loading ? "opacity-70 cursor-not-allowed" : ""
        }`}
        onClick={handleSave}
      >
        {loading ? <Loader2 className="animate-spin" /> : "Save Profile"}
      </motion.button>

      <motion.div
        className="mt-8 flex justify-between items-center text-gray-800 dark:text-gray-200 bg-white/70 dark:bg-gray-800/70 rounded-xl px-4 py-3 shadow"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <Star className="text-yellow-500" />
          <span className="font-semibold">Rating:</span>
          <span>{profile.averageRating?.toFixed(1) || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <PackageCheck className="text-green-500" />
          <span className="font-semibold">Deliveries:</span>
          <span>{profile.deliveriesCompleted || 0}</span>
        </div>
      </motion.div>

      {/* Selfie Modal */}
      <AnimatePresence>
        {showSelfieModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl space-y-6 max-w-sm w-full border-2 border-blue-400"
              initial={{ scale: 0.85, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 60 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">📸 Take a Live Selfie</h2>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="rounded-xl border-4 border-blue-500 mx-auto shadow-lg"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={captureAndUploadSelfie}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold shadow transition"
                >
                  {loading ? "Uploading..." : "Upload Selfie"}
                </button>
                <button
                  onClick={() => setShowSelfieModal(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold shadow transition"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                Please ensure your face is clearly visible.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}