import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaBars, FaTimes } from "react-icons/fa";
import { motion } from "framer-motion";
import hungryLogo from "../assets/HungryBOX-logo.jpg";

const Header = () => {
  const { user, isAnonymous, logout, role } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.theme === "dark");
  const location = useLocation();

  const toggleMenu = () => setMenuOpen(!menuOpen);

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
    `flex items-center gap-1 px-3 py-1 rounded-full transition duration-200 ${
      location.pathname === path
        ? "bg-yellow-300 text-black shadow-md scale-105"
        : "hover:scale-105 hover:text-yellow-200 dark:hover:text-yellow-300"
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
      <button
        onClick={logout}
        className="flex items-center gap-1 hover:text-yellow-200 hover:scale-105 transition duration-200"
      >
        Logout
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-gradient-to-r from-pink-500/70 to-red-400/70 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg border-b-2 border-pink-300 dark:border-gray-700">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">
        
        {/* 🍰 Logo + Title Group */}
        <motion.div
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Logo */}
          <div className="w-[55px] h-[55px] overflow-hidden rounded-full border-2 border-pink-300 transition-all duration-300 group-hover:shadow-[0_0_25px_#ff80ab]">
            <img
              src={hungryLogo}
              alt="HungryBox Logo"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Glowing Title */}
          <motion.span
            className="text-2xl font-bold tracking-wide text-white transition-all duration-300 group-hover:text-pink-100"
            whileHover={{
               scale:1.12,
               textShadow: "0 0 8px #ffb6c1, 0 0 16px #ff69b4",
            }}
            whileTap={{
               scale:1.12,
               textShadow: "0 0 8px #ffb6c1, 0 0 16px #ff69b4",
            }} 
          >

            HungryBox
          </motion.span>
        </motion.div>

        {/* 🌙 Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`hidden md:flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold transition-all duration-300 
          ${
            darkMode
              ? "bg-yellow-300 text-black hover:bg-yellow-400 shadow-md"
              : "bg-white/10 text-yellow-100 hover:bg-white/20"
          }`}
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>

        {/* 💻 Desktop Nav */}
        <nav className="hidden md:flex gap-4 text-lg font-medium">
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

        {/* 📱 Hamburger */}
        <div className="md:hidden text-2xl cursor-pointer" onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </div>

      {/* 📱 Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-gradient-to-r from-pink-600/90 to-red-500/90 px-6 pb-4 space-y-3 text-lg font-medium">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex justify-center py-1 rounded-full font-semibold 
            ${darkMode ? "bg-yellow-300 text-black" : "bg-white/10 text-yellow-100"}`}
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          {!user || isAnonymous ? (
            <>
              <Link to="/login" className={navItemClasses("/login")}>Login</Link>
              <Link to="/signup" className={navItemClasses("/signup")}>Signup</Link>
              <Link to="/delivery-auth" className={navItemClasses("/delivery-auth")}>Partner Login</Link>
            </>
          ) : (
            <div className="flex flex-col space-y-2">{navLinks}</div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
