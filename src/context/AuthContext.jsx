import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";

import {
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // 🔥 FIXED: Pass the 'auth' instance here
        signInAnonymously(auth)
          .then((userCredential) => {
            setUser(userCredential.user);
          })
          .catch((error) => {
            console.error("Anonymous sign-in failed:", error);
          });
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, logout: () => signOut(auth) }}>
      {children}
    </AuthContext.Provider>
  );
};
