import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import hungryLogo from "../assets/HungryBOX-logo.jpg";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user, isAnonymous, logout, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.theme === "dark");
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [darkMode]);

  const navItemClasses = (path) =>
    `rounded-full px-3 py-2 text-sm font-medium transition ${
      location.pathname === path
        ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
    }`;

  const navLinks = (
    <>
      <Link to="/" className={navItemClasses("/")}>Home</Link>
      <Link to="/cart" className={navItemClasses("/cart")}>Cart</Link>
      <Link to="/orders" className={navItemClasses("/orders")}>Orders</Link>
      <Link to="/track/last" className={navItemClasses("/track/last")}>Track</Link>
      <Link to="/profile" className={navItemClasses("/profile")}>Profile</Link>
      <Link to="/about" className={navItemClasses("/about")}>About Us</Link>
      {role === "admin" && <Link to="/admin" className={navItemClasses("/admin")}>Admin</Link>}
      <button onClick={logout} className="btn-ghost text-sm">Logout</button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700">
            <img src={hungryLogo} alt="HungryBox Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              HungryBox
            </span>
            <span className="muted hidden md:block">Fresh delivery from your cloud kitchen</span>
          </div>
        </Link>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`hidden rounded-full px-4 py-2 text-sm font-semibold transition md:flex ${
            darkMode
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
          }`}
        >
          {darkMode ? "Light" : "Dark"}
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          {!user || isAnonymous ? (
            <>
              <Link to="/login" className={navItemClasses("/login")}>Login</Link>
              <Link to="/signup" className={navItemClasses("/signup")}>Signup</Link>
              <Link to="/delivery-auth" className={navItemClasses("/delivery-auth")}>Partner Login</Link>
            </>
          ) : (
            navLinks
          )}
        </nav>

        <div className="cursor-pointer text-2xl text-gray-700 dark:text-gray-200 md:hidden" onClick={() => setMenuOpen((v) => !v)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="btn-ghost mb-3 flex w-full justify-center"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>

          {!user || isAnonymous ? (
            <div className="flex flex-col gap-2">
              <Link to="/login" className={navItemClasses("/login")}>Login</Link>
              <Link to="/signup" className={navItemClasses("/signup")}>Signup</Link>
              <Link to="/delivery-auth" className={navItemClasses("/delivery-auth")}>Partner Login</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">{navLinks}</div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
