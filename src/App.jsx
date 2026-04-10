import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { onMessageListener } from "./firebase/firebaseConfig";

import Header from "./components/Header";
import PartnerHeader from "./components/PartnerHeader";
import PrivateRoute from "./components/PrivateRoute";
import PartnerRoute from "./components/PartnerRoute";
import AdminRoute from "./components/AdminRoute";
import ChatBot from "./components/ChatBot";
import DarkModeToggle from "./components/DarkModeToggle";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileBottomNav from "./components/MobileBottomNav";

const Home = lazy(() => import("./pages/Home"));
const Shop = lazy(() => import("./pages/Shop"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
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
const ShopConnect = lazy(() => import("./pages/ShopConnect"));
const PartnerDashboard = lazy(() => import("./pages/partner/PartnerDashboard"));
const DeliveryAuth = lazy(() => import("./pages/DeliveryAuth"));
const DeliveryStatusPage = lazy(() => import("./pages/partner/DeliveryStatusPage"));
const PartnerProfile = lazy(() => import("./pages/partner/PartnerProfile"));
const PartnerEarnings = lazy(() => import("./pages/partner/PartnerEarnings"));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <motion.div
      className="page-container flex min-h-[70vh] items-center justify-center"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="card max-w-2xl p-10 text-center">
        <p className="mb-4 text-6xl">🍽️</p>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Page Not Found
        </h1>
        <p className="muted mx-auto mb-8 max-w-xl">
          The page you opened does not exist. If you were trying to open a store, use the shop directory below and jump back into ordering.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            Go Home
          </Link>
          <Link to="/shop" className="btn-ghost">
            Go to Shop
          </Link>
          <Link to="/orders" className="btn-ghost">
            Track Orders
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function App() {
  const { role } = useAuth();

  useEffect(() => {
    onMessageListener()
      .then((payload) => {
        const title = payload?.notification?.title || "New Notification";
        const body = payload?.notification?.body;
        toast.success(body ? `${title}\n${body}` : title, { duration: 5000 });
      })
      .catch(() => {});
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
      {role !== "delivery" && role !== "admin" ? <MobileBottomNav /> : null}
      {role === "delivery" ? <PartnerHeader /> : <Header />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:shopId" element={<ShopDetails />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/delivery-auth" element={<DeliveryAuth />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/shop-connect"
            element={
              <AdminRoute>
                <ShopConnect />
              </AdminRoute>
            }
          />

          <Route path="/partner/dashboard" element={<PartnerDashboard />} />
          <Route
            path="/partner/status/:orderId"
            element={
              <PartnerRoute>
                <DeliveryStatusPage />
              </PartnerRoute>
            }
          />
          <Route path="/partner/order/:orderId" element={<DeliveryStatusPage />} />
          <Route
            path="/partner/profile"
            element={
              <PartnerRoute>
                <PartnerProfile />
              </PartnerRoute>
            }
          />
          <Route
            path="/partner/earnings"
            element={
              <PartnerRoute>
                <PartnerEarnings />
              </PartnerRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <PrivateRoute>
                <Cart />
              </PrivateRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <Checkout />
              </PrivateRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <PrivateRoute>
                <OrderHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/order-history"
            element={
              <PrivateRoute>
                <OrderHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/track/:orderId"
            element={
              <PrivateRoute>
                <OrderHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/success"
            element={
              <PrivateRoute>
                <Success />
              </PrivateRoute>
            }
          />
          <Route
            path="/delivery-dashboard"
            element={
              <PrivateRoute>
                <CourierDashboard />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
