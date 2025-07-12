// src/pages/Cart.jsx
import { useCart } from "../context/CartContext";

const Cart = () => {
  const { cart, addToCart, removeFromCart, clearCart } = useCart();

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🛒 Your Cart</h2>

      {cart.length === 0 ? (
        <p style={styles.empty}>Your cart is empty.</p>
      ) : (
        <>
          <div style={styles.cartList}>
            {cart.map((item) => (
              <div key={item.id} style={styles.card}>
                <img src={item.image} alt={item.name} style={styles.image} />
                <div style={{ flex: 1 }}>
                  <h3 style={styles.title}>{item.name}</h3>
                  <p style={styles.desc}>{item.description}</p>
                  <p style={styles.price}>₹{item.price}</p>
                  <div style={styles.qtyRow}>
                    <button onClick={() => removeFromCart(item.id)} style={styles.qtyBtn}>−</button>
                    <span style={styles.qty}>{item.quantity}</span>
                    <button onClick={() => addToCart(item)} style={styles.qtyBtn}>+</button>
                    <button onClick={() => removeFromCart(item.id)} style={styles.removeBtn}>❌</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.summary}>
            <h3>Total: ₹{totalPrice}</h3>
            <button style={styles.placeBtn} onClick={clearCart}>Place Order</button>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "30px",
    maxWidth: "900px",
    margin: "auto",
  },
  heading: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "20px",
    color: "#e91e63",
  },
  empty: {
    fontSize: "1.2rem",
    textAlign: "center",
    color: "#777",
  },
  cartList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  card: {
    display: "flex",
    gap: "20px",
    padding: "20px",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  image: {
    width: "100px",
    height: "100px",
    objectFit: "cover",
    borderRadius: "10px",
  },
  title: {
    margin: 0,
    fontWeight: "bold",
    fontSize: "1.1rem",
  },
  desc: {
    fontSize: "0.9rem",
    color: "#666",
    marginBottom: "8px",
  },
  price: {
    fontWeight: "bold",
    color: "#222",
  },
  qtyRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "10px",
  },
  qtyBtn: {
    padding: "4px 10px",
    fontSize: "1rem",
    backgroundColor: "#eee",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  qty: {
    fontWeight: "bold",
    minWidth: "20px",
    textAlign: "center",
  },
  removeBtn: {
    marginLeft: "auto",
    background: "transparent",
    border: "none",
    color: "#e91e63",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  summary: {
    marginTop: "30px",
    textAlign: "right",
  },
  placeBtn: {
    marginTop: "10px",
    backgroundColor: "#e91e63",
    color: "#fff",
    padding: "10px 20px",
    border: "none",
    fontWeight: "bold",
    borderRadius: "5px",
    cursor: "pointer",
  },
};

export default Cart;
