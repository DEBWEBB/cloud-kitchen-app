import { useNavigate } from "react-router-dom";

export default function ShopSelector() {
  const navigate = useNavigate();

  const shops = [
    { name: "Mia&More", image: "/images/mia.png", path: "/shop/mia" },
    { name: "Monginis", image: "/images/monginis.png", path: "/shop/monginis" },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 justify-center">
      {shops.map((shop) => (
        <div
          key={shop.name}
          className="bg-white rounded-2xl shadow-xl p-4 cursor-pointer hover:scale-105 transition"
          onClick={() => navigate(shop.path)}
        >
          <img src={shop.image} alt={shop.name} className="h-32 w-32 object-cover mx-auto" />
          <h3 className="text-center font-semibold mt-3">{shop.name}</h3>
          <button className="mt-2 bg-red-500 text-white px-4 py-2 rounded-full block mx-auto">Order Now</button>
        </div>
      ))}
    </div>
  );
}
