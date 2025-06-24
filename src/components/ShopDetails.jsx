// src/components/ShopDetails.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { menuItems } from "../data/menu";
import MenuItemCard from "./MenuItemCard";
import { useCart } from "../context/CartContext";

const ShopDetails = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { cart, addToCart } = useCart();

  const categories = ["all", "cakes", "snacks", "pastries"];

  const filteredItems = menuItems.filter(
    (item) =>
      item.shop?.toLowerCase() === shopId?.toLowerCase() &&
      (selectedCategory === "all" || item.category === selectedCategory)
  );

  const handleAddToCart = (item) => {
    console.log("🛒 Add clicked:", item.name);
    addToCart(item); // ✅ Context handles quantity
  };

  // Track button press state for animation
  const [isPressed, setIsPressed] = useState(false);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>
        {shopId === "mio" ? "Mio Amore Menu" : "Monginis Menu"}
      </h2>

      {/* Filter Buttons */}
      <div style={styles.filterRow}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              ...styles.filterButton,
              backgroundColor: selectedCategory === cat ? "#e91e63" : "#f0f0f0",
              color: selectedCategory === cat ? "#fff" : "#333",
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={styles.grid}>
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <MenuItemCard key={item.id} item={item} onAdd={handleAddToCart} />
          ))
        ) : (
          <p style={styles.notFound}>No items found for "{shopId}"</p>
        )}
      </div>

      {/* Go to Cart Button */}
      {cart.length > 0 && (
        <div style={styles.cartBtnWrapper}>
          <button
            style={{
              ...styles.cartBtn,
              transform: isPressed ? "scale(0.96)" : "scale(1)",
              transition: "transform 0.2s ease",
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: `translateX(-50%)` + (isPressed ? " scale(0.96)" : ""),
              zIndex: 999,
              boxShadow: "0 5px 20px rgba(0,0,0,0.2)"
            }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onClick={() => {
              setIsPressed(false);
              navigate("/cart");
            }}
          >
            🛒 Go to Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
          </button>
        </div>
      )}

    </div>
  );
};

const styles = {
  container: {
    padding: "30px",
    maxWidth: "1100px",
    margin: "auto",
  },
  heading: {
    textAlign: "center",
    fontSize: "2.2rem",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#e91e63",
  },
  filterRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "8px 18px",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "0.3s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  notFound: {
    textAlign: "center",
    fontSize: "1.2rem",
    color: "#999",
  },
    cartBtnWrapper: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 999,
    width: "90%",
    maxWidth: "500px",
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none", // disable if cart is empty
  },
  cartBtn: {
    backgroundColor: "#e91e63",
    color: "#fff",
    padding: "14px 24px",
    borderRadius: "30px",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "bold",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "transform 0.2s ease, background 0.3s ease",
    pointerEvents: "auto", // enable button inside wrapper
  },
  cartBtnActive: {
  transform: "scale(0.96)", // tiny press feedback
}
  
};

export default ShopDetails;
