import { Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase/firebaseConfig";
import LogoutButton from "./LogoutButton";

const Header = () => {
  const [user] = useAuthState(auth);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-500 to-red-400 shadow-md sticky top-0 z-50">
      <Link to="/" className="text-white text-xl font-bold flex items-center gap-2">
        🍰 Cloud Kitchen
      </Link>

      <div className="flex gap-4 items-center">
        {user && (
          <>
            <Link to="/profile" className="text-white hover:underline">👤 Profile</Link>
            <LogoutButton />
          </>
        )}
        {!user && (
          <Link to="/login" className="text-white hover:underline">🔐 Login</Link>
        )}
      </div>
    </header>
  );
};

export default Header;
