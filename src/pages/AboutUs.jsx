import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowRight,
  HeartHandshake,
  Layers3,
  MapPinned,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import ProfileCard from "../components/ProfileCard";
import { db } from "../firebase/firebaseConfig";

const storyCards = [
  {
    title: "Local first",
    icon: Store,
    body:
      "HungryBox is built around nearby stores, familiar delivery routes, and quick neighborhood fulfilment instead of a one-size-fits-all marketplace.",
    accent: "from-rose-500/20 via-orange-400/10 to-transparent",
  },
  {
    title: "Secure handoff",
    icon: ShieldCheck,
    body:
      "Customer codes, rider verification, proof capture, and live delivery flows are designed to make each order feel more trusted and traceable.",
    accent: "from-cyan-500/20 via-sky-400/10 to-transparent",
  },
];

const platformHighlights = [
  {
    label: "Live local delivery",
    value: "Real-time rider flow",
    icon: Truck,
  },
  {
    label: "Store sync",
    value: "Menu and stock updates",
    icon: Layers3,
  },
  {
    label: "Customer confidence",
    value: "Verified handoff steps",
    icon: HeartHandshake,
  },
];

const milestoneCards = [
  {
    eyebrow: "What we are shaping",
    title: "A stronger local food portal",
    text:
      "We are combining shop operations, delivery protection, live order visibility, and a cleaner customer interface into one local-first product system.",
  },
  {
    eyebrow: "Why it matters",
    title: "Small details create trust",
    text:
      "Clear receipts, better delivery security, fresher menu updates, and visible order states help customers, stores, and partners feel aligned.",
  },
  {
    eyebrow: "How we design",
    title: "Practical, expressive, and fast",
    text:
      "We keep the interface warm and modern, but every visual decision still serves clarity, confidence, and smoother daily use on mobile.",
  },
];

export default function AboutUs() {
  const { register, handleSubmit, reset } = useForm();

  const contactAccent = useMemo(
    () => [
      "Fresh local food",
      "Fast storefront updates",
      "Safer delivery handoff",
      "Better customer experience",
    ],
    []
  );

  const onSubmit = async (data) => {
    try {
      await addDoc(collection(db, "contactMessages"), {
        ...data,
        timestamp: Timestamp.now(),
      });
      toast.success("Your message has been sent.");
      reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error("Could not send your message right now.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.14),_transparent_24%),linear-gradient(180deg,#fff7f5_0%,#ffffff_42%,#fffaf2_100%)] pb-24 pt-24 text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_24%),linear-gradient(180deg,#050816_0%,#0f172a_52%,#111827_100%)] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-20 h-52 w-52 rounded-full bg-pink-500/15 blur-3xl" />
        <div className="absolute right-[-4%] top-36 h-64 w-64 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="absolute bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="page-container relative z-10 space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]"
        >
          <div className="flex items-center justify-center">
            <ProfileCard
              name="Debjit Saha"
              title="Founder and Frontend Builder"
              handle="DEBWEB"
              status="Building locally"
              contactText="Jump to Contact"
              avatarUrl={undefined}
              showUserInfo
              enableTilt
              onContactClick={() =>
                document
                  .getElementById("contact-section")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          </div>

          <div className="space-y-6 rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-pink-600 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-200">
              <Sparkles className="h-4 w-4" />
              About HungryBox
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Local cloud kitchen delivery with a warmer, smarter interface.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                HungryBox is designed for neighborhood stores, short delivery routes,
                faster operations, and a cleaner customer journey. We are shaping a
                storefront that feels premium on the front end while staying practical
                for real local delivery work behind the scenes.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {platformHighlights.map(({ label, value, icon: Icon }) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -4 }}
                  className="rounded-3xl border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60"
                >
                  <div className="mb-4 inline-flex rounded-2xl bg-slate-950 px-3 py-3 text-white dark:bg-white dark:text-slate-950">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {contactAccent.map((item) => (
                <span
                  key={item}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="grid gap-5 lg:grid-cols-2">
          {storyCards.map(({ title, body, icon: Icon, accent }) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="group relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-80 transition duration-500 group-hover:opacity-100`} />
              <div className="relative z-10">
                <div className="inline-flex rounded-2xl bg-slate-950 px-3 py-3 text-white dark:bg-white dark:text-slate-950">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
                  {title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {body}
                </p>
              </div>
            </motion.article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {milestoneCards.map((card, index) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(255,247,245,0.88))] p-6 shadow-[0_16px_35px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.92),rgba(30,41,59,0.82))]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-pink-500 dark:text-pink-300">
                {card.eyebrow}
              </p>
              <h3 className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">
                {card.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {card.text}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <ArrowRight className="h-4 w-4" />
                Frontend, delivery, and store experience moving together
              </div>
            </motion.article>
          ))}
        </section>

        <motion.section
          id="contact-section"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr] dark:border-white/10 dark:bg-slate-900/60"
        >
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-white dark:bg-white dark:text-slate-950">
              <MapPinned className="h-4 w-4" />
              Contact
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Tell us what you want to improve next.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              If you want a new frontend pass, a store workflow improvement, or a
              delivery-side security update, send a note here and it will land in
              the HungryBox contact inbox.
            </p>

            <div className="grid gap-3">
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Focus area
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  Better food ordering, stronger store tools, and clearer local delivery.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Current direction
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                  Theme consistency, mobile polish, and operational clarity across the app.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input
              {...register("name", { required: true })}
              placeholder="Your name"
              className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-slate-950 outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-300/60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
            />
            <input
              {...register("email", { required: true })}
              type="email"
              placeholder="Your email"
              className="w-full rounded-3xl border border-slate-200 bg-white px-5 py-4 text-slate-950 outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-300/60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
            />
            <textarea
              {...register("message", { required: true })}
              placeholder="Tell us what you want to build or improve"
              rows={6}
              className="w-full rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 text-slate-950 outline-none transition focus:border-pink-300 focus:ring-2 focus:ring-pink-300/60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-5 py-4 font-semibold text-white shadow-[0_18px_40px_rgba(244,114,182,0.35)] transition hover:translate-y-[-1px]"
            >
              <Send className="h-4 w-4" />
              Send message
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
