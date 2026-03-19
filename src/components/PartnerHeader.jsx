import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function PartnerHeader() {
  const { logout } = useAuth();

  return (
    <motion.header
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-[100] flex w-full items-center justify-between border-b border-gray-100 bg-white/85 px-4 py-4 text-gray-900 shadow-sm backdrop-blur md:px-6 dark:border-gray-800 dark:bg-gray-900/85 dark:text-white"
    >
      <h1 className="text-xl font-bold">Delivery Portal</h1>
      <nav className="flex items-center gap-2 md:gap-3">
        <Link className="btn-ghost text-sm" to="/partner/dashboard">Orders</Link>
        <Link className="btn-ghost text-sm" to="/partner/profile">Profile</Link>
        <Link className="btn-ghost text-sm" to="/partner/earnings">Earnings</Link>
        <button onClick={logout} className="btn-primary text-sm">
          Logout
        </button>
      </nav>
    </motion.header>
  );
}
