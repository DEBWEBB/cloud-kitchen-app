/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ec4899",
          soft: "#fdf2f8",
          dark: "#be185d",
        },
        accent: {
          DEFAULT: "#fb923c",
          soft: "#fff7ed",
          dark: "#ea580c",
        },
      },
      boxShadow: {
        premium: "0 18px 45px rgba(15, 23, 42, 0.12)",
        float: "0 24px 60px rgba(236, 72, 153, 0.18)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionProperty: {
        background: "background-color",
      },
      keyframes: {
        fadeDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        fadeSlideIn: {
          "0%": { opacity: 0, transform: "translateY(-10px) scale(0.95)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        textWave: {
          "0%, 100%": { transform: "translateY(1)" },
          "50%": { transform: "translateY(-5px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "text-wave": "textWave 0.6s ease-in-out infinite alternate",
        "fade-down": "fadeDown 0.3s ease-out",
        blob: "blob 20s infinite",
        "fade-slide-in": "fadeSlideIn 0.8s ease-out forwards",
        "fade-slide-in-delayed": "fadeSlideIn 1.2s ease-out forwards",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
