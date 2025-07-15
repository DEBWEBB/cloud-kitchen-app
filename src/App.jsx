// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import OrderTracker from "./pages/OrderTracker";
import Profile from "./pages/Profile";
import CourierDashboard from "./pages/CourierDashboard";
import ShopDetails from "./components/ShopDetails";
import Success from "./pages/Success";
import AuthPage from "./pages/AuthPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AboutUs from "./pages/AboutUs";
import AdminPage from "./pages/AdminPage";
import AdminDashboard from "./pages/AdminDashboard";
import PartnerDashboard from "./pages/partner/PartnerDashboard";
import DeliveryAuth from "./pages/DeliveryAuth";
import DeliveryStatusPage from "./pages/partner/DeliveryStatusPage";
import PartnerProfile from "./pages/partner/PartnerProfile";
import PartnerEarnings from "./pages/partner/PartnerEarnings";

import Header from "./components/Header";
import PartnerHeader from "./components/PartnerHeader";
import PrivateRoute from "./components/PrivateRoute";
import PartnerRoute from "./components/PartnerRoute";
import AdminRoute from "./components/AdminRoute";

import ChatBot from "./components/ChatBot";
import DarkModeToggle from "./components/DarkModeToggle";
import { Toaster, toast } from "react-hot-toast";
import { requestForToken, onMessageListener } from "./firebase/firebaseConfig";

function App() {
  const { role } = useAuth();

  useEffect(() => {
    requestForToken();

    onMessageListener()
      .then((payload) => {
        const title = payload.notification?.title || "📦 Notification";
        const body = payload.notification?.body;
        toast.success(title, { description: body, duration: 4000 });
      })
      .catch((err) => console.error("FCM Error:", err));
  }, []);

  return (
    <Router>
      <Toaster position="top-right" reverseOrder={false} />
      <DarkModeToggle />
      <ChatBot />

      {/* Conditionally render header based on user role */}
      {role === "delivery" ? <PartnerHeader /> : <Header />}

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/shop/:shopId" element={<ShopDetails />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/about" element={<AboutUs />} />
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
        <Route path="/partner/dashboard" element={<PartnerDashboard />} />
        <Route path="/delivery-auth" element={<DeliveryAuth />} />
        <Route
          path="/partner/status/:orderId"
          element={
            <PartnerRoute>
              <DeliveryStatusPage />
            </PartnerRoute>
          }
        />
        <Route path="/partner/profile" element={<PartnerRoute><PartnerProfile/></PartnerRoute>} />
        <Route path="/partner/earnings" element={<PartnerRoute><PartnerEarnings/></PartnerRoute>} />

        {/* Protected */}
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
        <Route path="/order-history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
        <Route path="/track/:orderId" element={<PrivateRoute><OrderTracker /></PrivateRoute>} />
        <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />
        <Route path="/delivery-dashboard" element={<PrivateRoute><CourierDashboard /></PrivateRoute>} />
        <Route path="/partner/order/:orderId" element={<DeliveryStatusPage />} />

        {/* 404 */}
        <Route path="*" element={<div className="p-8 text-center text-xl">404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
