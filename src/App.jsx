// src/App.jsx — Refactored with ErrorBoundary and clean route organization
import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Toaster, toast } from "react-hot-toast";

// Eagerly loaded (always needed)
import Header from "./components/Header";
import PartnerHeader from "./components/PartnerHeader";
import PrivateRoute from "./components/PrivateRoute";
import PartnerRoute from "./components/PartnerRoute";
import AdminRoute from "./components/AdminRoute";
import ChatBot from "./components/ChatBot";
import DarkModeToggle from "./components/DarkModeToggle";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-loaded pages for better performance
const Home = lazy(() => import("./pages/Home"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const OrderTracker = lazy(() => import("./pages/OrderTracker"));
const Profile = lazy(() => import("./pages/Profile"));
const CourierDashboard = lazy(() => import("./pages/CourierDashboard"));
const ShopDetails = lazy(() => import("./components/ShopDetails"));
const Success = lazy(() => import("./pages/Success"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));
const DeliveryAuth = lazy(() => import("./pages/DeliveryAuth"));
const DeliveryStatusPage = lazy(() => import("./pages/partner/DeliveryStatusPage"));
const PartnerProfile = lazy(() => import("./pages/partner/PartnerProfile"));
const PartnerEarnings = lazy(() => import("./pages/partner/PartnerEarnings"));

// ── Page-level loading fallback ──────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ── 404 Page ─────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <p className="text-6xl mb-4">🍽️</p>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Looks like this page got eaten! Let's get you back on track.
      </p>
      <a
        href="/"
        className="bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold px-6 py-3 rounded-xl hover:from-pink-600 hover:to-orange-500 transition"
      >
        Back to Home
      </a>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const { role } = useAuth();

  // Initialize Firebase Cloud Messaging
  useEffect(() => {
    let cleanup;
    (async () => {
      try {
        const { requestForToken, onMessageListener } = await import("./firebase/firebaseConfig");
        await requestForToken();
        cleanup = await onMessageListener().then((payload) => {
          const title = payload?.notification?.title || "📦 New Notification";
          const body = payload?.notification?.body;
          toast.success(body ? `${title}\n${body}` : title, { duration: 5000 });
        }).catch(() => {});
      } catch {
        // FCM setup failure is non-critical — silently ignore
      }
    })();
    return () => typeof cleanup === "function" && cleanup();
  }, []);

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "12px",
            fontSize: "14px",
          },
        }}
      />

      <DarkModeToggle />
      <ChatBot />

      {/* Role-based header */}
      {role === "delivery" ? <PartnerHeader /> : <Header />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public Routes ─────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/shop/:shopId" element={<ShopDetails />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/delivery-auth" element={<DeliveryAuth />} />

          {/* ── Admin Routes ──────────────────────────── */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* ── Delivery Partner Routes ───────────────── */}
          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route path="/partner/status/:orderId" element={<PartnerRoute><DeliveryStatusPage /></PartnerRoute>} />
          <Route path="/partner/order/:orderId" element={<DeliveryStatusPage />} />
          <Route path="/partner/profile" element={<PartnerRoute><PartnerProfile /></PartnerRoute>} />
          <Route path="/partner/earnings" element={<PartnerRoute><PartnerEarnings /></PartnerRoute>} />

          {/* ── Protected User Routes ─────────────────── */}
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
          <Route path="/order-history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
          <Route path="/track/:orderId" element={<PrivateRoute><OrderTracker /></PrivateRoute>} />
          <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
          <Route path="/delivery-dashboard" element={<PrivateRoute><CourierDashboard /></PrivateRoute>} />

          {/* ── 404 ──────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;