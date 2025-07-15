// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Home = () => {
  const navigate = useNavigate();

  const stores = [
    {
      id: "mio",
      name: "Mio Amore",
      image: "./src/assets/mioamore.jpeg",
    },
    {
      id: "monginis",
      name: "Monginis",
      image: "./src/assets/monginis.png",
    },
  ];

  const quotes = [
    "Good food is the foundation of genuine happiness.",
    "You can't buy happiness, but you can buy cake—and that's kind of the same thing.",
    "A party without cake is just a meeting.",
    "There is no sincerer love than the love of food.",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 pt-10 dark:bg-gray-900 bg-white text-gray-800 dark:text-white transition duration-300">
      <motion.h1
        className="text-4xl md:text-5xl font-bold text-center text-pink-600 flex items-center gap-2"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        🍰 Welcome to HungryBox
      </motion.h1>

      <motion.p
        className="text-center text-lg mt-3 italic text-gray-600 dark:text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {quotes[Math.floor(Math.random() * quotes.length)]}
      </motion.p>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
        {stores.map((store, index) => (
          <motion.div
            key={store.id}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:scale-105 cursor-pointer border dark:border-gray-700"
            onClick={() => navigate(`/shop/${store.id}`)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.2 }}
          >
            <img
              src={store.image}
              alt={store.name}
              className="w-full h-52 object-cover"
            />
            <div className="p-5 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {store.name}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};



const styles = {
  container: {
    padding: "30px",
    maxWidth: "1100px",
    margin: "auto",
    textAlign: "center",
  },
  title: {
    fontSize: "2.5rem",
    color: "#e91e63",
    marginBottom: "10px",
  },
  quote: {
    fontStyle: "italic",
    fontSize: "1.2rem",
    color: "#555",
    marginBottom: "30px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    cursor: "pointer",
    paddingBottom: "10px",
    transition: "transform 0.2s ease",
  },
  image: {
    width: "100%",
    height: "180px",
    objectFit: "cover",
    borderTopLeftRadius: "12px",
    borderTopRightRadius: "12px",
  },
};

export default Home;
