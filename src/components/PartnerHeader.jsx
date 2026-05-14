import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function PartnerHeader() {
  const { logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
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
    `rounded-full px-4 py-2.5 text-sm font-semibold transition ${
      location.pathname === path
        ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg"
        : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      <motion.header
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-[100] border-b border-white/8 bg-slate-950/85 text-white shadow-[0_16px_50px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight md:text-2xl">Delivery Portal</h1>
            <p className="mt-1 hidden text-sm text-slate-400 md:block">
              Real-time delivery, earnings, and proof verification
            </p>
          </div>

          <nav className="hidden items-center gap-3 md:flex">
            <Link className={navItemClasses("/partner/dashboard")} to="/partner/dashboard">
              Orders
            </Link>
            <Link className={navItemClasses("/partner/profile")} to="/partner/profile">
              Profile
            </Link>
            <Link className={navItemClasses("/partner/earnings")} to="/partner/earnings">
              Earnings
            </Link>
            <button onClick={logout} className="btn-primary text-sm">
              Logout
            </button>
          </nav>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/55 backdrop-blur-sm md:hidden"
          >
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="mx-4 mt-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-[30px] border border-white/10 bg-slate-950/95 p-4 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Partner Navigation
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">Quick access</p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-slate-200"
                  aria-label="Close navigation menu"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-3 mobile-safe-bottom">
                <Link className={navItemClasses("/partner/dashboard")} to="/partner/dashboard">
                  Orders
                </Link>
                <Link className={navItemClasses("/partner/profile")} to="/partner/profile">
                  Profile
                </Link>
                <Link className={navItemClasses("/partner/earnings")} to="/partner/earnings">
                  Earnings
                </Link>
                <button onClick={logout} className="btn-primary mt-2 w-full text-sm">
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
