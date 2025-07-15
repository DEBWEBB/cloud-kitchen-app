import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function PartnerHeader() {
  const { logout } = useAuth();

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 w-full bg-blue-600 text-white shadow-lg px-6 py-4 z-[100] flex justify-between items-center"
    >
      <h1 className="font-bold text-xl">📦 Delivery Portal</h1>
      <nav className="space-x-6">
        <Link className="hover:underline" to="/partner/dashboard">Orders</Link>
        <Link className="hover:underline" to="/partner/profile">Profile</Link>
        <Link className="hover:underline" to="/partner/earnings">Earnings</Link>
        <button
          onClick={logout}
          className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </nav>
    </motion.header>
  );
}
