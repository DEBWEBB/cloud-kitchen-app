import { useCart } from "../context/CartContext";
import { motion } from "framer-motion";

export default function FoodCard({ item }) {
  const { addToCart } = useCart();

  return (
    <motion.div 
      className="bg-white shadow-xl p-4 rounded-xl text-center hover:scale-105 transition"
      whileHover={{ scale: 1.03 }}
    >
      <img src={item.image} alt={item.name} className="w-32 h-32 object-cover mx-auto rounded-lg" />
      <h4 className="text-lg font-bold mt-2">{item.name}</h4>
      <p className="text-gray-500">{item.weight}g</p>
      <p className="text-xl font-semibold">${item.price}</p>
      <button
        className="mt-3 bg-black text-white px-4 py-2 rounded-full"
        onClick={() => addToCart(item)}
      >
        Add to Cart
      </button>
    </motion.div>
  );
}
