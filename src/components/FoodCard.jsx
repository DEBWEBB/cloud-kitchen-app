import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";

export default function FoodCard({ item }) {
  const { addToCart } = useCart();

  return (
    <motion.div
      className="card overflow-hidden p-0 text-left"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <img src={item.image} alt={item.name} className="h-40 w-full object-cover" />
      <div className="space-y-2 p-4">
        <h4 className="text-lg font-bold text-gray-800 dark:text-white">{item.name}</h4>
        <p className="muted">{item.weight}g</p>
        <div className="flex items-center justify-between pt-2">
          <p className="price">Rs.{item.price}</p>
          <button className="btn-primary text-sm" onClick={() => addToCart(item)}>
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
