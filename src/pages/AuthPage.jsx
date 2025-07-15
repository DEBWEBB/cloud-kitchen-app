import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleToggle = () => {
    setError("");
    setIsLogin(!isLogin);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { email, password } = form;

    const res = isLogin
      ? await login(email, password)
      : await signup(email, password);

    if (res.success) {
      navigate("/"); // ✅ redirect on success
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-pink-200 to-purple-100 dark:from-black dark:via-gray-900 dark:to-gray-800 transition duration-300">
      <motion.div
        key={isLogin ? "login" : "signup"}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/20 dark:bg-white/5 backdrop-blur-md p-8 rounded-xl shadow-xl w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          {isLogin ? "Welcome Back 👋" : "Create an Account 🚀"}
        </h2>

        {error && (
          <div className="bg-red-100 text-red-800 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded bg-white/30 dark:bg-gray-800/40 backdrop-blur-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded bg-white/30 dark:bg-gray-800/40 backdrop-blur-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
          >
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-500">
          Are you a delivery partner?{" "}
          <Link to="/delivery-auth" className="text-blue-500 hover:underline">
            Login here 🚚
          </Link>
        </p>


        <p className="mt-4 text-center text-gray-700 dark:text-gray-300">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={handleToggle}
            className="text-purple-600 hover:underline dark:text-purple-400"
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
