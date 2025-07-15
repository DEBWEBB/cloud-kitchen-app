import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="fixed top-4 right-4 z-50 text-white dark:text-yellow-300 text-xl p-2 bg-black/30 dark:bg-white/10 backdrop-blur-sm rounded-full shadow-md"
      title="Toggle Dark Mode"
    >
      {dark ? <FaSun /> : <FaMoon />}
    </button>
  );
}
<div className="absolute top-4 right-4">
  <button
    onClick={() =>
      document.documentElement.classList.toggle("dark")
    }
    className="px-3 py-1 text-sm bg-black/10 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded hover:bg-black/20 dark:hover:bg-white/20 transition"
  >
    Toggle Dark 🌙
  </button>
</div>
