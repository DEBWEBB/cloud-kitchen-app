import { motion } from "framer-motion";
import { HeartHandshake, ShieldCheck, Sparkles, Truck } from "lucide-react";
import hungryLogo from "../assets/HungryBOX-logo.jpg";

const featureIcons = [Sparkles, HeartHandshake, Truck, ShieldCheck];

export default function AuthExperienceShell({
  eyebrow,
  title,
  subtitle,
  promptTitle,
  promptText,
  children,
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.16),_transparent_24%),linear-gradient(to_bottom,_#fff7f5,_#fff1f2_42%,_#fffaf5)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.16),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.12),_transparent_22%),linear-gradient(to_bottom,_#020617,_#111827_50%,_#020617)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-16 top-12 h-48 w-48 rounded-full bg-pink-300/40 blur-3xl dark:bg-pink-500/20"
          animate={{ y: [0, 24, 0], x: [0, 18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-24 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-400/15"
          animate={{ y: [0, -18, 0], x: [0, -22, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-rose-200/35 blur-3xl dark:bg-rose-500/12"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          className="hidden rounded-[36px] border border-white/70 bg-white/60 p-8 shadow-[0_36px_90px_-54px_rgba(15,23,42,0.42)] backdrop-blur lg:block dark:border-white/10 dark:bg-white/5"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="mb-8 inline-flex items-center gap-4 rounded-[28px] border border-white/70 bg-white/85 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <motion.div
              className="h-16 w-16 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-[0_16px_28px_-16px_rgba(244,114,182,0.85)]"
              animate={{ opacity: [0.86, 1, 0.86], scale: [1, 1.035, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={hungryLogo} alt="HungryBox" className="h-full w-full object-cover" />
            </motion.div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500 dark:text-pink-300">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                HungryBox
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sweet orders, kind service, and trusted local delivery.
              </p>
            </div>
          </motion.div>

          <motion.h2
            className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-slate-950 dark:text-white"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {promptTitle}
          </motion.h2>

          <motion.p
            className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
          >
            {promptText}
          </motion.p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Fresh cakes from nearby Bethuadahari shops",
              "Warm updates from checkout to doorstep",
              "Safer delivery with verified rider steps",
              "A smoother dashboard for every order moment",
            ].map((item, index) => {
              const Icon = featureIcons[index];
              return (
                <motion.div
                  key={item}
                  className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.26 + index * 0.08 }}
                >
                  <div className="inline-flex rounded-2xl bg-gradient-to-br from-pink-500 to-orange-400 p-3 text-white shadow-md">
                    <Icon size={18} />
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">
                    {item}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          className="rounded-[34px] border border-white/70 bg-white/82 p-5 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.48)] backdrop-blur xl:p-7 dark:border-white/10 dark:bg-slate-950/82"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-6 flex items-center gap-4 lg:hidden">
            <motion.div
              className="h-14 w-14 overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-[0_16px_28px_-16px_rgba(244,114,182,0.85)]"
              animate={{ opacity: [0.86, 1, 0.86], scale: [1, 1.035, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={hungryLogo} alt="HungryBox" className="h-full w-full object-cover" />
            </motion.div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500 dark:text-pink-300">
                {eyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                HungryBox
              </h2>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pink-500 dark:text-pink-300">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {subtitle}
            </p>
          </div>

          {children}
        </motion.section>
      </div>
    </div>
  );
}
