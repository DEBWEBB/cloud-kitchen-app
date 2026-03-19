import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db, requestForToken } from "../firebase/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { saveUserFCMToken } from "../utils/saveUserFCMToken";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const clearError = useCallback(() => setAuthError(null), []);

  const fetchUserRole = useCallback(async (uid) => {
    const collections = ["users", "partners"];
    for (const col of collections) {
      const snap = await getDoc(doc(db, col, uid));
      if (snap.exists()) return snap.data().role ?? null;
    }
    return null;
  }, []);

  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true };
    } catch (error) {
      const message = getFriendlyAuthError(error.code);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const signup = useCallback(async (email, password, displayName = "") => {
    setAuthError(null);
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (displayName) {
        await updateProfile(newUser, { displayName: displayName.trim() });
      }

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: email.trim(),
        displayName: displayName.trim() || "",
        createdAt: new Date().toISOString(),
        role: "user",
      });

      return { success: true };
    } catch (error) {
      const message = getFriendlyAuthError(error.code);
      setAuthError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRole = await fetchUserRole(firebaseUser.uid);
          setRole(userRole);

          const tokenSavedKey = `fcm_token_saved_${firebaseUser.uid}`;
          if (!localStorage.getItem(tokenSavedKey)) {
            try {
              const token = await requestForToken();
              if (token) {
                await saveUserFCMToken(token);
                localStorage.setItem(tokenSavedKey, "true");
              }
            } catch {}
          }
        } catch (err) {
          console.error("Failed to fetch user role:", err);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Loading HungryBox...
          </p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    role,
    authError,
    isAnonymous: !user,
    isAdmin: role === "admin",
    isPartner: role === "delivery",
    login,
    signup,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function getFriendlyAuthError(code) {
  const errors = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait before trying again.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
  };
  return errors[code] || "Authentication failed. Please try again.";
}
