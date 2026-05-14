import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingCart, Package, User } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
  { to: "/orders", label: "Orders", icon: Package },
  { to: "/profile", label: "Profile", icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-[28px] border border-gray-200/90 bg-white/92 px-2.5 py-2 shadow-float backdrop-blur md:hidden dark:border-gray-800 dark:bg-gray-900/92"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {ITEMS.map((item) => {
        const isActive =
          location.pathname === item.to ||
          (item.to !== "/" && location.pathname.startsWith(item.to));
        const Icon = item.icon;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-[0_10px_22px_rgba(244,114,182,0.28)]"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
