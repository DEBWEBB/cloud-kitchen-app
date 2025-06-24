// src/components/MenuItemCard.jsx
import React from "react";

const MenuItemCard = ({ item, onAdd }) => {
  return (
    <div style={styles.card}>
      {/* Image (if available) */}
      {item.image && (
        <img src={item.image} alt={item.name} style={styles.image} />
      )}

      {/* Item Name */}
      <div style={styles.title}>{item.name}</div>

      {/* Description */}
      <div style={styles.desc}>{item.description}</div>

      {/* Price & Add to Cart Button */}
      <div style={styles.footer}>
        <span style={styles.price}>₹{item.price}</span>
        <button
          style={styles.button}
          onClick={() => {
            console.log("🛒 Add clicked:", item.name); // Debug log
            onAdd(item);
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
};

const styles = {
  card: {
    padding: "15px",
    borderRadius: "12px",
    background: "#fff",
    boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "transform 0.2s",
    overflow: "hidden",
    cursor: "default",
  },
  image: {
    width: "100%",
    height: "160px",
    objectFit: "cover",
    borderRadius: "10px",
    marginBottom: "12px",
  },
  title: {
    fontWeight: "bold",
    fontSize: "1.1rem",
    marginBottom: "6px",
    color: "#222",
  },
  desc: {
    fontSize: "0.9rem",
    color: "#666",
    marginBottom: "10px",
    minHeight: "40px",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontWeight: "600",
    fontSize: "1rem",
  },
  button: {
    backgroundColor: "#e91e63",
    color: "#fff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.9rem",
    transition: "all 0.2s ease",
  },
};

export default MenuItemCard;
