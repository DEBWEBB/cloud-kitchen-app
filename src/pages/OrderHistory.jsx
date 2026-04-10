import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import {
  CalendarClock,
  CheckCircle2,
  Clipboard,
  Clock3,
  Download,
  Flame,
  Heart,
  IndianRupee,
  MapPin,
  Package2,
  Receipt,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  X,
} from "lucide-react";
import hungryLogo from "../assets/HungryBOX-logo.jpg";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { OrderTrackerPanel } from "./OrderTracker";
import CustomerDeliveryLiveCard from "../components/CustomerDeliveryLiveCard";
import { revealOrderSecurityCode } from "../utils/orderSecurity";
import { getShopById } from "../data/shops";

const ORDER_STAGES = ["pending", "picked", "on the way", "delivered"];

const statusPalette = {
  pending: {
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    glow: "from-amber-500/25 via-orange-500/10 to-transparent",
    label: "Awaiting Dispatch",
    icon: Clock3,
  },
  picked: {
    chip: "bg-sky-100 text-sky-700 border-sky-200",
    glow: "from-sky-500/20 via-cyan-500/10 to-transparent",
    label: "Picked Up",
    icon: Package2,
  },
  "on the way": {
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    glow: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
    label: "In Transit",
    icon: Truck,
  },
  delivered: {
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    glow: "from-emerald-500/20 via-teal-500/10 to-transparent",
    label: "Delivered",
    icon: CheckCircle2,
  },
  cancelled: {
    chip: "bg-rose-100 text-rose-700 border-rose-200",
    glow: "from-rose-500/20 via-red-500/10 to-transparent",
    label: "Cancelled",
    icon: X,
  },
};

const toTimestampDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeStatus = (status) => {
  if (!status) return "pending";
  const normalized = String(status).toLowerCase();
  return statusPalette[normalized] ? normalized : "pending";
};

const formatCurrency = (amount = 0) =>
  `Rs.${Number(amount || 0).toLocaleString("en-IN")}`;

const imageDataUrlCache = new Map();

const fetchImageAsDataUrl = async (src) => {
  if (!src) return null;
  if (imageDataUrlCache.has(src)) {
    return imageDataUrlCache.get(src);
  }

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Could not load image: ${src}`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  imageDataUrlCache.set(src, dataUrl);
  return dataUrl;
};

const formatOrderTime = (value) => {
  const date = toTimestampDate(value);
  if (!date) return "Just now";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getRelativeLabel = (value) => {
  const date = toTimestampDate(value);
  if (!date) return "Fresh";
  const diffHours = Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
};

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildReorderItems = (order) =>
  (order.items || []).map((item, index) => ({
    id:
      item.id ||
      `${item.shop || order.store || "kitchen"}-${slugify(item.name)}-${index + 1}`,
    name: item.name,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1),
    description:
      item.description ||
      item.brand ||
      `Reordered from ${order.storeName || order.store || "your previous order"}`,
    image: item.image || hungryLogo,
    shop: item.shop || order.store || "mio",
    brand: item.brand || order.storeName || "HungryBox",
  }));

const getTopItems = (orders, limit = 4) => {
  const counter = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const current = counter.get(item.name) || {
        name: item.name,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += Number(item.quantity || 1);
      current.revenue += Number(item.price || 0) * Number(item.quantity || 1);
      counter.set(item.name, current);
    });
  });

  return [...counter.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
};

const getStatusProgress = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "cancelled") return 0;
  const stageIndex = ORDER_STAGES.indexOf(normalized);
  if (stageIndex === -1) return 12;
  return Math.round(((stageIndex + 1) / ORDER_STAGES.length) * 100);
};

const titleCase = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");

const resolveShopMeta = (order) => {
  if (order?.store) {
    return getShopById(order.store);
  }

  const storeName = String(order?.storeName || order?.store || "").toLowerCase();
  if (storeName.includes("monginis")) return getShopById("monginis");
  return getShopById("mio");
};

const getReceiptMessages = (shop) => {
  if (shop?.id === "monginis") {
    return {
      store:
        "Thank you for celebrating with Monginis Bethuadahari. We are glad to be part of your local moments.",
      app:
        "HungryBox thanks you for supporting local cake shops and trusted neighborhood delivery partners.",
    };
  }

  return {
    store:
      "Thank you for ordering from Mio Amore - Bethuadahari. We hope your bakery order arrived fresh and just on time.",
    app:
      "Thank you for choosing HungryBox. Your order helps our local stores and delivery partners grow together.",
  };
};

export default function OrderHistory() {
  const { user } = useAuth();
  const { setCartItems } = useCart();
  const navigate = useNavigate();
  const { orderId: trackedOrderId } = useParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [secretCodes, setSecretCodes] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("order_favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return undefined;
    }

    const orderQuery = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      orderQuery,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Orders listener failed:", error);
        toast.error("Could not load your orders right now.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!selectedOrder?.id || selectedOrder.secretCode || secretCodes[selectedOrder.id]) {
      return;
    }

    ensureSecretCodeForOrder(selectedOrder).catch(() => {});
  }, [secretCodes, selectedOrder]);

  useEffect(() => {
    localStorage.setItem("order_favorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const nextOrders = orders.filter((order) => {
      const normalizedStatus = normalizeStatus(order.status);
      const matchesSearch =
        !term ||
        order.id.toLowerCase().includes(term) ||
        (order.storeName || order.store || "").toLowerCase().includes(term) ||
        (order.items || []).some((item) =>
          String(item.name).toLowerCase().includes(term)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          normalizedStatus !== "delivered" &&
          normalizedStatus !== "cancelled") ||
        normalizedStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    nextOrders.sort((left, right) => {
      if (sortBy === "oldest") {
        return (
          (toTimestampDate(left.createdAt)?.getTime() || 0) -
          (toTimestampDate(right.createdAt)?.getTime() || 0)
        );
      }
      if (sortBy === "high") return Number(right.total || 0) - Number(left.total || 0);
      if (sortBy === "low") return Number(left.total || 0) - Number(right.total || 0);
      return (
        (toTimestampDate(right.createdAt)?.getTime() || 0) -
        (toTimestampDate(left.createdAt)?.getTime() || 0)
      );
    });

    return nextOrders;
  }, [orders, searchTerm, sortBy, statusFilter]);

  const analytics = useMemo(() => {
    const totalSpend = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const deliveredOrders = orders.filter(
      (order) => normalizeStatus(order.status) === "delivered"
    );
    const activeOrders = orders.filter((order) => {
      const status = normalizeStatus(order.status);
      return status !== "delivered" && status !== "cancelled";
    });
    const statusCounts = orders.reduce((accumulator, order) => {
      const key = normalizeStatus(order.status);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const stores = orders.reduce((accumulator, order) => {
      const key = order.storeName || order.store || "HungryBox";
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    const ordersThisMonth = orders.filter((order) => {
      const createdAt = toTimestampDate(order.createdAt);
      if (!createdAt) return false;
      const now = new Date();
      return (
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear()
      );
    }).length;

    const topItems = getTopItems(orders);
    const topStore =
      Object.entries(stores).sort((a, b) => b[1] - a[1])[0]?.[0] || "HungryBox";

    return {
      totalOrders: orders.length,
      deliveredOrders: deliveredOrders.length,
      activeOrders: activeOrders.length,
      totalSpend,
      avgOrderValue: orders.length ? Math.round(totalSpend / orders.length) : 0,
      ordersThisMonth,
      completionRate: orders.length
        ? Math.round((deliveredOrders.length / orders.length) * 100)
        : 0,
      topItems,
      topStore,
      statusCounts,
      spotlight:
        activeOrders[0] ||
        deliveredOrders[0] ||
        orders[0] ||
        null,
    };
  }, [orders]);

  const toggleFavorite = (orderId) => {
    setFavoriteIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId]
    );
  };

  const downloadInvoice = async (order) => {
    try {
      const secureCode = await ensureSecretCodeForOrder(order);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const logoDataUrl = await fetchImageAsDataUrl(hungryLogo).catch(() => null);
      const shop = resolveShopMeta(order);
      const receiptShortId = order.id.slice(-6).toUpperCase();
      const orderItems = order.items || [];
      const itemCount = orderItems.reduce(
        (total, item) => total + Number(item.quantity || 1),
        0
      );
      const calculatedSubtotal = orderItems.reduce(
        (total, item) =>
          total + Number(item.price || 0) * Number(item.quantity || 1),
        0
      );
      const subtotal = Number(order.productTotal || calculatedSubtotal || 0);
      const deliveryCharge = Number(order.deliveryCharge || 0);
      const totalPaid = Number(order.total || subtotal + deliveryCharge);
      const paymentMethod = titleCase(order.paymentMethod || "COD");
      const paymentStatus = titleCase(order.paymentStatus || "pending");
      const routeDistance =
        typeof order.partnerDistanceKm === "number"
          ? `${order.partnerDistanceKm.toFixed(1)} km rider match`
          : typeof order.distanceKm === "number"
          ? `${Number(order.distanceKm).toFixed(1)} km delivery route`
          : "Pinned delivery address";
      const riderVerification = order.partnerVerified
        ? "Verified rider"
        : "Verification pending";
      const issuedAt = new Date().toLocaleString("en-IN");
      const thankYouMessages = getReceiptMessages(shop);

      const drawChip = (x, y, width, text, fill, textColor) => {
        pdf.setFillColor(...fill);
        pdf.roundedRect(x, y, width, 9, 4, 4, "F");
        pdf.setTextColor(...textColor);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text(text, x + width / 2, y + 5.8, { align: "center" });
      };

      const drawDetailCard = (x, y, width, title, lines, tint) => {
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, width, 45, 6, 6, "FD");
        pdf.setFillColor(...tint);
        pdf.roundedRect(x, y, width, 10, 6, 6, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10.5);
        pdf.text(title, x + 5, y + 6.7);

        pdf.setTextColor(17, 24, 39);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);

        let lineY = y + 16;
        lines.forEach((line) => {
          const wrapped = pdf.splitTextToSize(line, width - 10);
          pdf.text(wrapped, x + 5, lineY);
          lineY += wrapped.length * 4.5 + 2.5;
        });
      };

      const qrPayload = JSON.stringify(
        {
          portal: "HungryBox",
          orderId: order.id,
          receiptId: receiptShortId,
          generatedAt: issuedAt,
          placedAt: formatOrderTime(order.createdAt),
          store: {
            name: order.storeName || order.store || "HungryBox",
            address: shop?.address || "",
            mapsUrl: shop?.mapsUrl || "",
          },
          customer: {
            name: order.name || "Customer",
            phone: order.phone || "",
            address: order.address || "",
          },
          deliveryPartner: {
            name: order.courierName || "Pending assignment",
            phone: order.courierPhone || "",
            verified: Boolean(order.partnerVerified),
          },
          payment: {
            method: paymentMethod,
            status: paymentStatus,
            reference: order.paymentReference || order.paymentGatewayPaymentId || "",
          },
          totals: {
            subtotal,
            delivery: deliveryCharge,
            total: totalPaid,
          },
          items: orderItems.map((item) => ({
            name: item.name,
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
          })),
          handoff: {
            code: secureCode || "Protected in customer app",
            verification: riderVerification,
          },
        },
        null,
        0
      );

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        qrPayload
      )}`;
      const qrDataUrl = await fetchImageAsDataUrl(qrUrl).catch(() => null);

      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setFillColor(20, 24, 39);
      pdf.roundedRect(margin, margin, contentWidth, 38, 8, 8, "F");
      pdf.setFillColor(236, 72, 153);
      pdf.circle(pageWidth - 26, 26, 16, "F");
      pdf.setFillColor(251, 146, 60);
      pdf.circle(pageWidth - 16, 22, 12, "F");

      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "JPEG", margin + 4, margin + 7, 20, 20);
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(21);
      pdf.text("HungryBox", margin + 28, margin + 13);
      pdf.setFontSize(10.5);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Branded customer receipt and delivery verification summary",
        margin + 28,
        margin + 20
      );
      pdf.text(`Receipt generated on ${issuedAt}`, margin + 28, margin + 26);

      drawChip(margin + 2, 47, 32, `#${receiptShortId}`, [255, 228, 230], [159, 18, 57]);
      drawChip(
        margin + 38,
        47,
        40,
        titleCase(order.status || "pending"),
        [220, 252, 231],
        [22, 101, 52]
      );
      drawChip(
        margin + 82,
        47,
        50,
        `${itemCount} item${itemCount === 1 ? "" : "s"}`,
        [224, 231, 255],
        [67, 56, 202]
      );
      drawChip(
        pageWidth - margin - 44,
        47,
        42,
        formatCurrency(totalPaid),
        [255, 247, 237],
        [154, 52, 18]
      );

      pdf.setFillColor(255, 247, 245);
      pdf.roundedRect(margin, 60, contentWidth, 31, 6, 6, "F");
      pdf.setTextColor(17, 24, 39);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text(`Order #${receiptShortId}`, margin + 6, 71);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Full order ID: ${order.id}`, margin + 6, 78);
      pdf.text(`Placed on: ${formatOrderTime(order.createdAt)}`, margin + 6, 84);
      pdf.text(`Store: ${order.storeName || order.store || "HungryBox"}`, 116, 71);
      pdf.text(`Payment: ${paymentMethod} / ${paymentStatus}`, 116, 78);
      pdf.text(`Route note: ${routeDistance}`, 116, 84);

      const sectionTop = 98;
      const cardGap = 4;
      const detailCardWidth = (contentWidth - cardGap * 2) / 3;
      const storeCardX = margin + detailCardWidth + cardGap;
      const riderCardX = storeCardX + detailCardWidth + cardGap;

      drawDetailCard(
        margin,
        sectionTop,
        detailCardWidth,
        "Customer",
        [
          `Name: ${order.name || "Customer"}`,
          `Phone: ${order.phone || "Not available"}`,
          `Address: ${order.address || "Not available"}`,
        ],
        [15, 118, 110]
      );
      drawDetailCard(
        storeCardX,
        sectionTop,
        detailCardWidth,
        "Store",
        [
          `Outlet: ${order.storeName || order.store || "HungryBox"}`,
          `Category: ${shop?.type || "Cloud kitchen partner"}`,
          `Address: ${shop?.address || "Local service area"}`,
        ],
        [79, 70, 229]
      );
      drawDetailCard(
        riderCardX,
        sectionTop,
        detailCardWidth,
        "Delivery partner",
        [
          `Name: ${order.courierName || "Pending assignment"}`,
          `Phone: ${order.courierPhone || "Not available"}`,
          `Security: ${riderVerification}`,
        ],
        [249, 115, 22]
      );

      const itemsTop = 149;
      const itemsWidth = 116;
      const summaryX = margin + itemsWidth + 6;
      const summaryWidth = contentWidth - itemsWidth - 6;
      const leftColumnWidth = itemsWidth;
      const rightColumnX = summaryX;
      const rightColumnWidth = summaryWidth;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(margin, itemsTop, itemsWidth, 78, 6, 6, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Itemized bill", margin + 5, itemsTop + 8);
      pdf.line(margin + 5, itemsTop + 13, margin + itemsWidth - 5, itemsTop + 13);
      pdf.setFontSize(8.8);
      pdf.text("Item", margin + 5, itemsTop + 19);
      pdf.text("Qty", margin + 76, itemsTop + 19);
      pdf.text("Amount", margin + itemsWidth - 5, itemsTop + 19, { align: "right" });

      let itemY = itemsTop + 27;
      (order.items || []).forEach((item, index) => {
        if (itemY > 220) return;
        pdf.setDrawColor(243, 244, 246);
        pdf.line(margin + 5, itemY - 4, margin + leftColumnWidth - 5, itemY - 4);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(`${index + 1}. ${item.name}`, margin + 5, itemY + 1);
        pdf.setFont("helvetica", "normal");
        pdf.text(
          `Qty ${item.quantity || 1}  •  ${formatCurrency(
            Number(item.price || 0) * Number(item.quantity || 1)
          )}`,
          margin + 5,
          itemY + 7
        );
        itemY += 14;
      });

      pdf.roundedRect(rightColumnX, itemsTop, rightColumnWidth, 78, 6, 6, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Billing and verification", rightColumnX + 5, itemsTop + 8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const summaryRows = [
        ["Subtotal", formatCurrency(subtotal)],
        ["Delivery charge", formatCurrency(deliveryCharge)],
        ["Total paid", formatCurrency(totalPaid)],
        ["Payment reference", order.paymentReference || order.paymentGatewayPaymentId || "Not recorded"],
        ["Secret handoff code", secureCode || "Protected in customer app"],
      ];

      let summaryY = itemsTop + 18;
      summaryRows.forEach(([label, value], index) => {
        if (index === 2) {
          pdf.setFillColor(255, 247, 237);
          pdf.roundedRect(rightColumnX + 4, summaryY - 6, rightColumnWidth - 8, 12, 4, 4, "F");
        }
        pdf.text(label, rightColumnX + 5, summaryY);
        const wrappedValue = pdf.splitTextToSize(String(value), rightColumnWidth - 36);
        pdf.text(wrappedValue, rightColumnX + rightColumnWidth - 5, summaryY, { align: "right" });
        summaryY += index === 3 ? 12 : 10;
      });

      const qrBlockTop = 238;
      pdf.roundedRect(margin, qrBlockTop, contentWidth, 44, 6, 6, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Smart verification QR", margin + 5, qrBlockTop + 8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      const qrDescription =
        "This QR stores the core receipt payload including order ID, customer details, rider details, payment state, totals, and item summary for quick verification.";
      pdf.text(pdf.splitTextToSize(qrDescription, contentWidth - 70), margin + 5, qrBlockTop + 15);

      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, "PNG", pageWidth - margin - 34, qrBlockTop + 5, 28, 28);
      } else {
        pdf.setFillColor(243, 244, 246);
        pdf.roundedRect(pageWidth - margin - 34, qrBlockTop + 5, 28, 28, 4, 4, "F");
        pdf.setTextColor(100, 116, 139);
        pdf.setFontSize(8);
        pdf.text("QR unavailable", pageWidth - margin - 20, qrBlockTop + 20, {
          align: "center",
        });
        pdf.setTextColor(17, 24, 39);
      }

      pdf.setFontSize(8.5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(
        "HungryBox portal receipt • Generated for customer reference and delivery verification",
        margin,
        pageHeight - 8
      );

      pdf.save(`HungryBox-${order.id.slice(-6).toUpperCase()}-receipt.pdf`);
    } catch (error) {
      console.error("Receipt generation failed:", error);
      toast.error("Could not generate the receipt right now.");
    }
  };

  const handleReorder = (order) => {
    const nextCart = buildReorderItems(order);
    if (!nextCart.length) {
      toast.error("This order has no items to reorder.");
      return;
    }

    setCartItems(nextCart);
    toast.success("Your previous order has been moved back to cart.");
    navigate("/cart");
  };

  const copyOrderId = async (order) => {
    try {
      await navigator.clipboard.writeText(order.id);
      toast.success("Order ID copied.");
    } catch {
      toast.error("Could not copy order ID.");
    }
  };

  const ensureSecretCodeForOrder = async (order) => {
    if (!order?.id) return "";
    if (order.secretCode) return order.secretCode;
    if (secretCodes[order.id]) return secretCodes[order.id];
    if (!order.secretCodeProtected) return "";

    try {
      const payload = await revealOrderSecurityCode({ orderId: order.id });
      const nextCode = payload.secretCode || "";
      setSecretCodes((current) => ({
        ...current,
        [order.id]: nextCode,
      }));
      return nextCode;
    } catch {
      return "";
    }
  };

  const shareOrder = async (order) => {
    const trackUrl = `${window.location.origin}${window.location.pathname}#/track/${order.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `HungryBox order ${order.id.slice(-6).toUpperCase()}`,
          text: `Track my HungryBox order from ${
            order.storeName || order.store || "HungryBox"
          }.`,
          url: trackUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(trackUrl);
      toast.success("Tracking link copied.");
    } catch {
      toast.error("Could not share the order right now.");
    }
  };

  const closeTrackedOrder = () => {
    navigate("/orders");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 dark:bg-gray-950">
        <div className="page-container space-y-6">
          <div className="card overflow-hidden p-8">
            <div className="space-y-4 animate-pulse">
              <div className="h-4 w-36 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-12 w-80 rounded-3xl bg-gray-200 dark:bg-gray-800" />
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 rounded-3xl bg-gray-200 dark:bg-gray-800"
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="card h-48 animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.12),_transparent_26%),linear-gradient(to_bottom,_#fff7f5,_#f8fafc_22%,_#f8fafc)] pt-24 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="page-container pb-24">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.5)] backdrop-blur md:p-8 dark:border-white/10 dark:bg-gray-900/75"
        >
          <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-pink-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-orange-300/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-pink-600 dark:border-pink-500/20 dark:bg-gray-900/70 dark:text-pink-300">
                <Sparkles size={14} />
                Orders Command Center
              </div>
              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-gray-950 md:text-5xl dark:text-white">
                Your orders now feel like a premium delivery dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300 md:text-base">
                Review every order, monitor live deliveries, jump back into your
                favorite baskets, and see where your spending and cravings are
                trending.
              </p>
            </div>

            {analytics.spotlight ? (
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="glass-card relative min-w-full overflow-hidden rounded-[28px] border border-white/30 p-5 lg:min-w-[340px] lg:max-w-[360px]"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    statusPalette[normalizeStatus(analytics.spotlight.status)].glow
                  }`}
                />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                        Spotlight
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        {analytics.spotlight.storeName ||
                          analytics.spotlight.store ||
                          "HungryBox"}
                      </h2>
                    </div>
                    <StatusChip status={analytics.spotlight.status} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {analytics.spotlight.items?.slice(0, 2).map((item) => item.name).join(", ") ||
                      "Your latest basket"}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniMetric
                      label="Total"
                      value={formatCurrency(analytics.spotlight.total || 0)}
                    />
                    <MiniMetric
                      label="Placed"
                      value={getRelativeLabel(analytics.spotlight.createdAt)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Link
                      to={`/track/${analytics.spotlight.id}`}
                      className="btn-primary flex-1 text-center"
                    >
                      Track Now
                    </Link>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(analytics.spotlight)}
                      className="btn-ghost"
                    >
                      Quick View
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </div>
        </motion.section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatTile
            icon={Package2}
            title="Total Orders"
            value={analytics.totalOrders}
            tone="from-slate-900 to-slate-700"
            detail={`${analytics.ordersThisMonth} this month`}
          />
          <StatTile
            icon={IndianRupee}
            title="Spend"
            value={formatCurrency(analytics.totalSpend)}
            tone="from-emerald-600 to-teal-500"
            detail={`${formatCurrency(analytics.avgOrderValue)} avg basket`}
          />
          <StatTile
            icon={Truck}
            title="Live Orders"
            value={analytics.activeOrders}
            tone="from-violet-600 to-fuchsia-500"
            detail="Active or in transit"
          />
          <StatTile
            icon={Flame}
            title="Top Store"
            value={analytics.topStore}
            tone="from-orange-500 to-amber-400"
            detail={`${analytics.completionRate}% completion rate`}
          />
          <StatTile
            icon={ShieldCheck}
            title="Delivered"
            value={analytics.deliveredOrders}
            tone="from-sky-600 to-cyan-500"
            detail="Successfully completed"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card rounded-[30px] border-white/60 bg-white/75 p-5 backdrop-blur md:p-6 dark:border-white/10 dark:bg-gray-900/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Control Deck
                </p>
                <h2 className="mt-2 text-2xl font-bold">Filter, search, and jump faster</h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 lg:max-w-2xl lg:flex-row">
                <label className="relative flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by order ID, kitchen, or item"
                    className="input-style w-full rounded-2xl border-white/80 bg-white/80 pl-11 dark:border-white/10 dark:bg-gray-950/60"
                  />
                </label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="input-style min-w-[170px] rounded-2xl border-white/80 bg-white/80 dark:border-white/10 dark:bg-gray-950/60"
                >
                  <option value="latest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="high">Highest value</option>
                  <option value="low">Lowest value</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "all",
                "active",
                "pending",
                "picked",
                "on the way",
                "delivered",
                "cancelled",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    statusFilter === status
                      ? "bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status === "active"
                    ? "Active"
                    : status}
                </button>
              ))}
            </div>
          </div>

          <div className="card rounded-[30px] border-white/60 bg-white/75 p-5 backdrop-blur md:p-6 dark:border-white/10 dark:bg-gray-900/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                  Taste Insights
                </p>
                <h2 className="mt-2 text-2xl font-bold">Signals from your order history</h2>
              </div>
              <div className="rounded-2xl bg-pink-50 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300">
                <Receipt size={22} />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-600 dark:text-gray-300">
                    Delivery completion
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {analytics.completionRate}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.completionRate}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(analytics.statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <StatusBreakdownRow
                      key={status}
                      status={status}
                      count={count}
                      total={analytics.totalOrders || 1}
                    />
                  ))}
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                  Most repeated dishes
                </p>
                <div className="flex flex-wrap gap-2">
                  {analytics.topItems.length ? (
                    analytics.topItems.map((item, index) => (
                      <span
                        key={item.name}
                        className={`rounded-full px-3 py-2 text-sm font-semibold ${
                          index === 0
                            ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {item.name} x{item.quantity}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Place a few more orders to unlock dish trends.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {filteredOrders.length ? (
            filteredOrders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                isFavorite={favoriteIds.includes(order.id)}
                onFavorite={() => toggleFavorite(order.id)}
                onOpen={() => setSelectedOrder(order)}
                onCopy={() => copyOrderId(order)}
                onDownload={() => downloadInvoice(order)}
                onReorder={() => handleReorder(order)}
                onShare={() => shareOrder(order)}
              />
            ))
          ) : (
            <div className="card rounded-[30px] border-white/60 bg-white/75 p-12 text-center backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow-lg">
                <Search size={24} />
              </div>
              <h3 className="mt-6 text-2xl font-bold">No orders match this view</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                Try another status filter, adjust your search, or place a fresh
                order to populate this dashboard again.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setSortBy("latest");
                  }}
                  className="btn-ghost"
                >
                  Reset Filters
                </button>
                <Link to="/shop" className="btn-primary">
                  Browse Kitchens
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {trackedOrderId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[65] bg-slate-950/55 p-4 backdrop-blur-md"
            onClick={closeTrackedOrder}
          >
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[34px] border border-white/15 bg-white/90 p-4 shadow-2xl dark:bg-gray-950/92 md:p-6"
              >
                <OrderTrackerPanel
                  orderId={trackedOrderId}
                  embedded
                  onClose={closeTrackedOrder}
                />
              </motion.div>
            </div>
          </motion.div>
        ) : null}
        {selectedOrder ? (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCopy={() => copyOrderId(selectedOrder)}
            onDownload={() => downloadInvoice(selectedOrder)}
            onReorder={() => handleReorder(selectedOrder)}
            onShare={() => shareOrder(selectedOrder)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function StatTile({ icon: Icon, title, value, detail, tone }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-gray-900/75"
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${tone}`} />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <h3 className="mt-3 text-2xl font-black text-gray-950 dark:text-white">
            {value}
          </h3>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br ${tone} p-3 text-white shadow-lg`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{detail}</p>
    </motion.div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 shadow-sm dark:bg-gray-950/60">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}

function StatusChip({ status }) {
  const normalized = normalizeStatus(status);
  const config = statusPalette[normalized] || statusPalette.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.chip}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function StatusBreakdownRow({ status, count, total }) {
  const normalized = normalizeStatus(status);
  const ratio = Math.round((count / total) * 100);
  const config = statusPalette[normalized] || statusPalette.pending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold capitalize text-gray-700 dark:text-gray-300">
          {config.label}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {count} order{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

function OrderCard({
  order,
  index,
  isFavorite,
  onFavorite,
  onOpen,
  onCopy,
  onDownload,
  onReorder,
  onShare,
}) {
  const normalizedStatus = normalizeStatus(order.status);
  const config = statusPalette[normalizedStatus] || statusPalette.pending;
  const progress = getStatusProgress(order.status);
  const itemsPreview = (order.items || []).slice(0, 3);
  const remainingItems = Math.max(0, (order.items || []).length - itemsPreview.length);
  const isActive = normalizedStatus !== "delivered" && normalizedStatus !== "cancelled";
  const isDelivered = normalizedStatus === "delivered";
  const paymentStatus = order?.paymentStatus
    ? {
        status: order.paymentStatus,
        gatewayOrderId: order.paymentGatewayOrderId || "",
        gatewayPaymentId: order.paymentGatewayPaymentId || "",
      }
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-[30px] border border-white/70 bg-white/80 p-5 shadow-[0_28px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur md:p-6 dark:border-white/10 dark:bg-gray-900/75"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${config.glow}`} />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex-1">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg">
                <Package2 size={28} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={order.status} />
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                    {getRelativeLabel(order.createdAt)}
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600 dark:bg-pink-500/10 dark:text-pink-300">
                      Live order
                    </span>
                  ) : null}
                  {isDelivered ? (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                    >
                      <Sparkles size={13} />
                      Order completed
                    </motion.span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-2xl font-black text-gray-950 dark:text-white">
                  Order #{order.id.slice(-6).toUpperCase()}
                </h3>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <Store size={16} />
                    {order.storeName || order.store || "HungryBox"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarClock size={16} />
                    {formatOrderTime(order.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} />
                    {order.distanceKm ? `${order.distanceKm} km route` : "Pinned address"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onFavorite}
                className={`rounded-2xl border px-3 py-2 transition ${
                  isFavorite
                    ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <Heart size={18} className={isFavorite ? "fill-current" : ""} />
              </button>
              <button type="button" onClick={onOpen} className="btn-ghost">
                Details
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {itemsPreview.map((item) => (
              <div
                key={`${order.id}-${item.name}`}
                className="rounded-2xl border border-gray-100 bg-white/85 px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Qty {item.quantity || 1} - {formatCurrency(Number(item.price || 0))}
                </p>
              </div>
            ))}
            {remainingItems ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                +{remainingItems} more item{remainingItems === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  Delivery progress
                </span>
                <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-amber-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm lg:min-w-[240px]">
              <OrderMetaTile label="Items" value={(order.items || []).length} />
              <OrderMetaTile label="Total" value={formatCurrency(order.total || 0)} />
            </div>
          </div>

          {(isActive || order.deliveryDelayNotice || order.courierName) && (
            <div className="mt-5">
              <CustomerDeliveryLiveCard
                order={order}
                compact
                paymentStatus={paymentStatus}
              />
            </div>
          )}

          {isDelivered ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 overflow-hidden rounded-[28px] border border-emerald-200/80 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.22),_transparent_40%),linear-gradient(135deg,_rgba(236,253,245,0.92),_rgba(255,247,237,0.9))] p-4 dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(135deg,_rgba(6,78,59,0.35),_rgba(51,65,85,0.3))]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-lg">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">
                      Completed Successfully
                    </p>
                    <p className="mt-2 text-base font-semibold text-gray-950 dark:text-white">
                      This order reached you safely and is fully closed.
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Reorder it anytime or open the tracker to review the final delivery record.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm dark:bg-gray-950/50 dark:text-gray-200">
                  100% delivery progress
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-[250px]">
          {normalizedStatus !== "cancelled" ? (
            <Link to={`/track/${order.id}`} className="btn-primary text-center">
              Track Order
            </Link>
          ) : null}
          <button type="button" onClick={onReorder} className="btn-ghost">
            <RotateCcw size={16} className="mr-2 inline-flex" />
            Reorder Basket
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onCopy} className="btn-ghost">
              <Clipboard size={16} className="mr-2 inline-flex" />
              Copy
            </button>
            <button type="button" onClick={onShare} className="btn-ghost">
              <Share2 size={16} className="mr-2 inline-flex" />
              Share
            </button>
          </div>
          <button type="button" onClick={onDownload} className="btn-ghost">
            <Download size={16} className="mr-2 inline-flex" />
            Invoice
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function OrderMetaTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onCopy,
  onDownload,
  onReorder,
  onShare,
}) {
  const normalizedStatus = normalizeStatus(order.status);
  const config = statusPalette[normalizedStatus] || statusPalette.pending;
  const paymentStatus = order?.paymentStatus
    ? {
        status: order.paymentStatus,
        gatewayOrderId: order.paymentGatewayOrderId || "",
        gatewayPaymentId: order.paymentGatewayPaymentId || "",
      }
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-slate-950/55 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/15 bg-white p-6 shadow-2xl dark:bg-gray-900 md:p-8"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${config.glow}`} />

          <div className="relative">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <StatusChip status={order.status} />
                <h2 className="mt-4 text-3xl font-black text-gray-950 dark:text-white">
                  Order #{order.id.slice(-6).toUpperCase()}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {formatOrderTime(order.createdAt)} from{" "}
                  {order.storeName || order.store || "HungryBox"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="self-start rounded-2xl border border-gray-200 p-3 text-gray-500 transition hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
              <div className="space-y-6">
                <section className="rounded-[28px] bg-gray-50 p-5 dark:bg-gray-800/70">
                  <h3 className="text-lg font-bold">Item breakdown</h3>
                  <div className="mt-4 space-y-3">
                    {(order.items || []).map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-gray-900/80"
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Qty {item.quantity || 1}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] bg-gray-50 p-5 dark:bg-gray-800/70">
                  <h3 className="text-lg font-bold">Routing and delivery</h3>
                  <div className="mt-4">
                    <CustomerDeliveryLiveCard
                      order={order}
                      paymentStatus={paymentStatus}
                    />
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <OrderMetaTile
                      label="Address"
                      value={order.address || "Saved delivery address"}
                    />
                    <OrderMetaTile
                      label="Partner"
                      value={order.courierName || "Partner not assigned yet"}
                    />
                    <OrderMetaTile
                      label="Distance"
                      value={
                        order.partnerDistanceKm
                          ? `${order.partnerDistanceKm} km away`
                          : order.distanceKm
                          ? `${order.distanceKm} km route`
                          : "Route pending"
                      }
                    />
                    <OrderMetaTile
                      label="Secret Code"
                      value={
                        order.secretCode ||
                        secretCodes[order.id] ||
                        (order.secretCodeProtected
                          ? "Protected in customer app"
                          : "Available after placement")
                      }
                    />
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-[28px] bg-gray-50 p-5 dark:bg-gray-800/70">
                  <h3 className="text-lg font-bold">Payment summary</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <SummaryRow label="Products" value={formatCurrency(order.productTotal || 0)} />
                    <SummaryRow label="Delivery" value={formatCurrency(order.deliveryCharge || 0)} />
                    <SummaryRow label="Discount" value={formatCurrency(order.discount || 0)} />
                    <SummaryRow
                      label="Payment method"
                      value={order.paymentMethod || "COD"}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                    <span className="text-lg font-bold">Grand total</span>
                    <span className="text-2xl font-black text-gray-950 dark:text-white">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </section>

                <section className="rounded-[28px] bg-gray-50 p-5 dark:bg-gray-800/70">
                  <h3 className="text-lg font-bold">Quick actions</h3>
                  <div className="mt-4 grid gap-3">
                    <Link to={`/track/${order.id}`} className="btn-primary text-center">
                      Open Live Tracker
                    </Link>
                    <button type="button" onClick={onReorder} className="btn-ghost">
                      <RotateCcw size={16} className="mr-2 inline-flex" />
                      Reorder This Basket
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={onCopy} className="btn-ghost">
                        <Clipboard size={16} className="mr-2 inline-flex" />
                        Copy ID
                      </button>
                      <button type="button" onClick={onShare} className="btn-ghost">
                        <Share2 size={16} className="mr-2 inline-flex" />
                        Share
                      </button>
                    </div>
                    <button type="button" onClick={onDownload} className="btn-ghost">
                      <Download size={16} className="mr-2 inline-flex" />
                      Download Invoice
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
