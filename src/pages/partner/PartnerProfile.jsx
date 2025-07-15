import React, { useState, useEffect, useRef } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";
import { db } from "../../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import { Loader2, Star, PackageCheck } from "lucide-react";

export default function PartnerProfile() {
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

  const [editing, setEditing] = useState(false); // Track if editing
  const uid = user?.uid;

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

  // When any field changes, clear photoURL and set editing mode
  const handleChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
      photoURL: "", // Clear selfie on any edit
    }));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!profile.name || !profile.phone || !profile.location) {
      toast.error("All fields are required!");
      return;
    }
    if (!profile.photoURL) {
      toast.error("Please upload a live selfie before saving.");
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

  const captureAndUploadSelfie = async () => {
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot || !uid) return;

    try {
      setLoading(true);
      const response = await fetch(screenshot);
      const blob = await response.blob();
      const filePath = `partners/${uid}.jpg`; // Always overwrite

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const photoURL = data?.publicUrl;

      await setDoc(doc(db, "partners", uid), { photoURL }, { merge: true });

      setProfile((prev) => ({ ...prev, photoURL }));
      toast.success("Selfie uploaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload selfie");
    } finally {
      setLoading(false);
    }
  };

  // Always require selfie if photoURL is empty
  if (!profile.photoURL) {
    return (
      <motion.div
        className="pt-28 p-6 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-xl space-y-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">📸 Take a Live Selfie</h2>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="rounded-xl border-4 border-blue-500"
        />
        <button
          onClick={captureAndUploadSelfie}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
        >
          {loading ? "Uploading..." : "Upload Selfie & Continue"}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="pt-28 p-6 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">Partner Profile</h2>

      <div className="flex justify-center mb-4">
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={profile.photoURL ? `${profile.photoURL}?t=${Date.now()}` : "/default-avatar.png"}
          alt="Selfie"
          className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Your Name</label>
        <input
          name="name"
          value={profile.name}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
        <input
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Your Area / Location</label>
        <input
          name="location"
          value={profile.location}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold text-gray-700 dark:text-gray-300">Email (Read-only)</label>
        <input
          value={user?.email || ""}
          disabled
          className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed text-gray-700 dark:text-white"
        />
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={loading}
        className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition"
        onClick={handleSave}
      >
        {loading ? <Loader2 className="animate-spin" /> : "Save Profile"}
      </motion.button>

      <div className="mt-6 flex justify-between items-center text-gray-800 dark:text-gray-200">
        <div className="flex items-center gap-2">
          <Star className="text-yellow-500" />
          <span>Rating: {profile.averageRating?.toFixed(1) || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <PackageCheck className="text-green-500" />
          <span>Deliveries: {profile.deliveriesCompleted || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}