import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import AuthExperienceShell from "../components/AuthExperienceShell";

export default function AuthPage() {
  return (
    <AuthExperienceShell
      eyebrow="Start Here"
      title="Choose how you’d like to enter HungryBox."
      subtitle="Whether you’re returning for a quick reorder or starting your first sweet delivery, your path is ready."
      promptTitle="One place to begin, with a little more joy built in."
      promptText="We want the first screen to feel inviting too. Pick the route that matches you and we’ll take it from there."
    >
      <div className="grid gap-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
        >
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 p-3 text-white shadow-md">
            <Sparkles size={18} />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Customer account</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Browse local shops, place fresh orders, and keep every delivery update in one calm flow.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-20px_rgba(244,114,182,0.9)] transition hover:brightness-110"
            >
              Login
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/signup"
              className="inline-flex flex-1 items-center justify-center rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Sign up
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
        >
          <div className="inline-flex rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 p-3 text-white shadow-md">
            <Truck size={18} />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Delivery partner</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Enter the partner security flow, verify your shift, and manage live deliveries with proof and tracking.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/delivery-auth"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            >
              Partner login
              <ArrowRight size={16} />
            </Link>
            <div className="inline-flex flex-1 items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <ShieldCheck size={16} />
              Secure shift access
            </div>
          </div>
        </motion.div>
      </div>
    </AuthExperienceShell>
  );
}
