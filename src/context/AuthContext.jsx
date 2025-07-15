// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { saveUserFCMToken } from "../utils/saveUserFCMToken";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Loading state

  // ✅ Login
  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await saveUserFCMToken();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ✅ Signup
  const signup = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email,
        createdAt: new Date().toISOString(),
        role: "user",
      });

      await saveUserFCMToken();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ✅ Logout
  const logout = () => signOut(auth);

  // ✅ Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAnonymous(firebaseUser.isAnonymous);

        // 🔁 Try fetching user doc first
        let docRef = doc(db, "users", firebaseUser.uid);
        let userDoc = await getDoc(docRef);

        // ❗ If not found, fallback to partners collection
        if (!userDoc.exists()) {
          docRef = doc(db, "partners", firebaseUser.uid);
          userDoc = await getDoc(docRef);
        }

        setRole(userDoc.exists() ? userDoc.data().role : null);

        await saveUserFCMToken();
      } else {
        setUser(null);
        setIsAnonymous(true);
        setRole(null);
      }
      setLoading(false); // ✅ Done loading
    });

    return () => unsub();
  }, []);

  // ✅ While checking user
  if (loading) {
    return <div className="p-8 text-center text-xl">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isAnonymous, login, signup, logout, role }}>
      {children}
    </AuthContext.Provider>
  );
};
