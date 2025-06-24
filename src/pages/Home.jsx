// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const stores = [
    {
      id: "mio",
      name: "Mio Amore",
      image: "./assets/mioamore.jpg",
    },
    {
      id: "monginis",
      name: "Monginis",
      image: "./assets/monginis.jpg",
    },
  ];

  const quotes = [
    "Good food is the foundation of genuine happiness.",
    "You can't buy happiness, but you can buy cake—and that's kind of the same thing.",
    "A party without cake is just a meeting.",
    "There is no sincerer love than the love of food.",
  ];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to HungryBox 🍰</h1>
      <p style={styles.quote}>{quotes[Math.floor(Math.random() * quotes.length)]}</p>

      <div style={styles.grid}>
        {stores.map((store) => (
          <div
            key={store.id}
            style={styles.card}
            onClick={() => navigate(`/shop/${store.id}`)}
          >
            <img src={store.image} alt={store.name} style={styles.image} />
            <h3>{store.name}</h3>
          </div>
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
