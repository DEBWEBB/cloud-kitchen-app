
// src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import getCroppedImg from "../utils/cropImage";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    photoURL: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [cropData, setCropData] = useState(null);
  const fileRef = useRef();

  const userId = user?.uid;

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile((prev) => ({ ...prev, ...docSnap.data() }));
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, profile, { merge: true });
      toast.success("✅ Profile updated!");
    } catch (err) {
      toast.error("Error saving profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCropAndUpload = async () => {
    if (!selectedImage || !cropData) return;
    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg(selectedImage, cropData);
      const fileName = `${userId}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(fileName, croppedBlob, { contentType: "image/jpeg" });

      if (uploadError) {
        toast.error("Upload failed");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(fileName);

      const photoURL = publicUrlData.publicUrl;
      setProfile((prev) => ({ ...prev, photoURL }));
      await setDoc(doc(db, "users", userId), { photoURL }, { merge: true });
      toast.success("🎉 Photo updated!");
      setSelectedImage(null);
    } catch (err) {
      toast.error("Failed to crop/upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-24 px-6 bg-gradient-to-br from-pink-100 to-purple-100 dark:from-black dark:to-gray-900">
      <div className="max-w-2xl mx-auto bg-white/80 dark:bg-gray-800 rounded-xl p-8 shadow-2xl backdrop-blur-lg">
        <h1 className="text-3xl text-center font-bold text-pink-600 mb-8">👤 Your Profile</h1>

        <div className="flex flex-col items-center space-y-4">
          <motion.img
            src={profile.photoURL || "/default-avatar.png"}
            alt="Profile"
            className="w-28 h-28 object-cover rounded-full border-4 border-pink-400 shadow-lg"
            whileHover={{ scale: 1.05 }}
          />
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            onChange={handleImageUpload}
            className="text-sm text-gray-600"
          />
          {uploading && <p className="text-blue-500">Uploading image...</p>}
        </div>

        {selectedImage && (
          <div className="mt-4 space-y-4">
            <img
              src={selectedImage}
              alt="Preview"
              className="rounded-xl border w-full max-h-64 object-contain"
            />
            {/* 👇 Add your custom cropping UI and set cropData state */}
            <button
              onClick={handleCropAndUpload}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-semibold transition"
            >
              ✂️ Crop & Upload
            </button>
            <button
              onClick={() => setSelectedImage(null)}
              className="ml-4 bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded-full"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-4">
          <input
            name="name"
            value={profile.name}
            onChange={handleChange}
            placeholder="Name"
            className="input-style"
          />
          <input
            name="email"
            value={profile.email}
            disabled
            placeholder="Email"
            className="input-style bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
          />
          <input
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            placeholder="Phone"
            className="input-style"
          />
          <textarea
            name="address"
            value={profile.address}
            onChange={handleChange}
            placeholder="Address"
            className="input-style"
            rows={3}
          />
        </div>

        <motion.button
          onClick={handleSave}
          whileTap={{ scale: 0.95 }}
          className="mt-6 w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded-full font-semibold"
          disabled={loading}
        >
          {loading ? "Saving..." : "💾 Save Changes"}
        </motion.button>
      </div>
    </div>
  );
}
