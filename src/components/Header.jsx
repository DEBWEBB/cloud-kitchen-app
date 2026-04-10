import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaBars, FaTimes } from "react-icons/fa";
import hungryLogo from "../assets/HungryBOX-logo.jpg";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { user, isAnonymous, logout, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.theme === "dark");
  const location = useLocation();
  const mobilePanelRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [darkMode]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (mobilePanelRef.current && !mobilePanelRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
      <Link to="/orders" className={navItemClasses("/orders")}>Track</Link>
      <Link to="/profile" className={navItemClasses("/profile")}>Profile</Link>
      <Link to="/about" className={navItemClasses("/about")}>About Us</Link>
      {role === "admin" && <Link to="/admin" className={navItemClasses("/admin")}>Admin</Link>}
      {role === "admin" && <Link to="/shop-connect" className={navItemClasses("/shop-connect")}>Shop Ops</Link>}
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

        <button
          type="button"
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200/80 bg-white/80 text-2xl text-gray-700 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-sm md:hidden"
          >
            <motion.div
              ref={mobilePanelRef}
              initial={{ opacity: 0, y: -18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="mx-4 mt-24 rounded-[30px] border border-white/60 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-gray-900/95"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
                    Navigation
                  </p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                    Quick menu
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  aria-label="Close navigation menu"
                >
                  <FaTimes />
                </button>
              </div>

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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
};

export default Header;
