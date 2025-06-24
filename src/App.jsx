import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderHistory from "./pages/OrderHistory";
import OrderTracker from "./pages/OrderTracker";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import CourierDashboard from "./pages/CourierDashboard";
import ChatBot from "./components/ChatBot";
import DarkModeToggle from "./components/DarkModeToggle";
import { useEffect } from "react";
import { requestForToken, onMessageListener } from "./firebase/firebaseConfig";
import Success from "./pages/Success";
import PrivateRoute from "./components/PrivateRoute";
import ShopDetails from "./components/ShopDetails"; 
import Signup from "./pages/Signup"; 
import Header from "./components/Header";






function App() {
  useEffect(() => {
    requestForToken();
    onMessageListener().then(payload => {
      console.log("New FCM Message:", payload);
      alert(payload?.notification?.title + ": " + payload?.notification?.body);
    });
  }, []);

  return (
    <Router>
      <DarkModeToggle />
      <ChatBot />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/track/:orderId" element={<OrderTracker />} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/delivery-dashboard" element={<CourierDashboard />} />
        <Route path="/success" element={<Success />} />
        <Route path="/order-history" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
        <Route path="/shop/:shopId" element={<ShopDetails />} /> {/* ✅ Added this route */}
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;
