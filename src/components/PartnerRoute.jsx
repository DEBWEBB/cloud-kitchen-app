import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";

export default function PartnerRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  const [isPartner, setIsPartner] = useState(null);

  useEffect(() => {
    if (user) {
      (async () => {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        setIsPartner(docSnap.data()?.role === "delivery");
      })();
    }
  }, [user]);

  if (loading || isPartner === null) {
    return <div className="p-12 text-center text-lg">Checking access...</div>;
  }

  if (!user || !isPartner) {
    return <Navigate to="/delivery-auth" />;
  }

  return children;
}
