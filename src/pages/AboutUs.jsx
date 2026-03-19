import React from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import ProfileCard from "../components/ProfileCard";
import { db } from "../firebase/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const poems = [
  "Fresh flavors dancing on your tongue 🍓",
  "Where code meets cuisine – pure delight 🍜",
  "Stirring bowls, stirring souls 🥄💫",
  "Sweet treats, coding feats 🍪👨‍💻",
  "Savory bytes, digital nights 🍔🌙",
  "Cuisine curated, code created 🧁🖥️",
  "Flavor spun, fun begun 🍟🎉",
  "Baking brilliance, coding resilience 🍞⚙️",
  "From skillet to screen, dream’s cuisine 🍳📱",
  "Taste the passion in every line 🥗💻"
];

const getPoemColor = (text) => {
  if (text.includes("🍓") || text.includes("🍪") || text.includes("🍟")) return "from-pink-500 to-red-400";
  if (text.includes("🍜") || text.includes("🍔") || text.includes("🍳")) return "from-yellow-400 to-orange-500";
  if (text.includes("💻") || text.includes("👨‍💻")) return "from-blue-500 to-indigo-500";
  return "from-purple-500 to-pink-500";
};

export default function AboutUs() {
  const particlesInit = async (main) => await loadFull(main);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      await addDoc(collection(db, "contactMessages"), {
        ...data,
        timestamp: Timestamp.now()
      });
      alert("Thanks, your message has been sent! 🚀");
      reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      alert("Oops! Something went wrong.");
    }
  };

  return (
    <div className="relative bg-black text-white min-h-screen overflow-x-hidden">
      {/* 🌀 Particle Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            background: { color: "#000" },
            fpsLimit: 60,
            interactivity: {
              events: { onHover: { enable: true, mode: "grab" } },
              modes: { grab: { distance: 150, links: { opacity: 0.3 } } }
            },
            particles: {
              color: { value: "#fff" },
              links: { color: "#fff", distance: 130, opacity: 0.15 },
              move: { enable: true, speed: 0.6 },
              number: { value: 70 },
              opacity: { value: 0.2 },
              size: { value: { min: 1, max: 3 } }
            }
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col justify-start items-center px-4 pt-10 pb-20 space-y-16">
        {/* 👤 Profile Card */}
        <ProfileCard
          name="Debjit Saha"
          title="Web Developer"
          handle="DEBWEB"
          status="Online"
          contactText="Contact Me"
          avatarUrl={undefined}
          showUserInfo={true}
          enableTilt={true}
          onContactClick={() =>
            document.getElementById("contact-section")?.scrollIntoView({ behavior: "smooth" })
          }
        />

        {/* 📝 About Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-base sm:text-lg max-w-4xl text-center font-medium leading-relaxed tracking-wide text-indigo-200"
        >
          👨‍🍳 Welcome to <span className="text-pink-400">Cloud Kitchen</span> — where flavors meet frontend! 🍕✨ <br />
          Explore creativity, enjoy digital recipes, and connect through <span className="text-yellow-300">code & cuisine</span>. 💻🍩🎉 <br />
          Let’s mix ingredients, sprinkle some logic, and serve you tasty apps & ideas 🍜👨‍🍳🚀🎯🍽️
        </motion.p>

        {/* 📜 Poem Slider */}
        <div className="w-full overflow-hidden max-w-5xl">
          <motion.div
            className="flex gap-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ repeat: Infinity, duration: poems.length * 1.5, ease: "linear" }}
          >
            {[...poems, ...poems].map((poem, i) => (
              <div
                key={i}
                className="relative min-w-[320px] px-6 py-4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300"
              >
                <div
                  className={`absolute -inset-2 rounded-2xl blur-2xl opacity-40 animate-pulse z-0 bg-gradient-to-br ${getPoemColor(poem)}`}
                />
                <p className="relative text-center text-lg font-bold text-white drop-shadow-md z-10">
                  “{poem}”
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* 📬 Contact Form */}
        <motion.div
          id="contact-section"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-xl bg-white/10 backdrop-blur-lg rounded-2xl px-8 py-10 shadow-2xl border border-white/10"
        >
          <h2 className="text-3xl font-bold mb-6 text-white text-center">Contact Me 💌</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <input
              {...register("name", { required: true })}
              placeholder="Your Name"
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-indigo-400 outline-none"
            />
            <input
              {...register("email", { required: true })}
              type="email"
              placeholder="Your Email"
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-indigo-400 outline-none"
            />
            <textarea
              {...register("message", { required: true })}
              placeholder="Your Message"
              rows="4"
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 ring-indigo-400 outline-none"
            />
            <button
              type="submit"
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg transition duration-300"
            >
              Send Message
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
