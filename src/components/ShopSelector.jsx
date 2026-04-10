import { useNavigate } from "react-router-dom";
import { shopCatalog } from "../data/shops";

export default function ShopSelector() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-center gap-6 md:flex-row">
      {shopCatalog.map((shop) => (
        <div
          key={shop.id}
          className="cursor-pointer rounded-2xl bg-white p-4 shadow-xl transition hover:scale-105"
          onClick={() => navigate(`/shop/${shop.id}`)}
        >
          <img
            src={shop.image}
            alt={shop.name}
            className="mx-auto h-32 w-32 object-cover"
          />
          <h3 className="mt-3 text-center font-semibold">{shop.name}</h3>
          <p className="mt-1 text-center text-xs text-gray-500">{shop.localName}</p>
          <button
            type="button"
            className="mx-auto mt-2 block rounded-full bg-red-500 px-4 py-2 text-white"
          >
            Order Now
          </button>
        </div>
      ))}
    </div>
  );
}
